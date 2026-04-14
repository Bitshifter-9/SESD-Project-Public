import { Content, PrismaClient } from "@prisma/client";

type ScoredContent = {
  content: Content;
  score: number;
  reason: string;
};

type StrategyResult = Map<string, { score: number; reason: string }>;

interface RecommendationStrategy {
  weight: number;
  generate(profileId: string, db: PrismaClient): Promise<StrategyResult>;
}

class ContentBasedStrategy implements RecommendationStrategy {
  weight = 0.45;

  async generate(profileId: string, db: PrismaClient): Promise<StrategyResult> {
    const watched = await db.watchHistory.findMany({
      where: { profileId },
      include: { content: { include: { contentGenres: { include: { genre: true } } } } }
    });

    if (watched.length === 0) {
      return new Map();
    }

    const seenContentIds = new Set(watched.map((entry) => entry.contentId));
    const genreCount = new Map<string, number>();

    for (const entry of watched) {
      for (const link of entry.content.contentGenres) {
        genreCount.set(link.genre.name, (genreCount.get(link.genre.name) ?? 0) + 1);
      }
    }

    const allContent = await db.content.findMany({
      include: { contentGenres: { include: { genre: true } } }
    });

    const results: StrategyResult = new Map();
    for (const item of allContent) {
      if (seenContentIds.has(item.id)) {
        continue;
      }

      let overlap = 0;
      for (const cg of item.contentGenres) {
        overlap += genreCount.get(cg.genre.name) ?? 0;
      }

      if (overlap > 0) {
        results.set(item.id, {
          score: overlap,
          reason: "Genre match with your recent history"
        });
      }
    }

    return results;
  }
}

class CollaborativeFilteringStrategy implements RecommendationStrategy {
  weight = 0.35;

  async generate(profileId: string, db: PrismaClient): Promise<StrategyResult> {
    const current = await db.watchHistory.findMany({ where: { profileId } });
    const currentSet = new Set(current.map((entry) => entry.contentId));

    if (currentSet.size === 0) {
      return new Map();
    }

    const otherProfiles = await db.watchHistory.findMany({
      where: { profileId: { not: profileId } },
      include: { profile: true }
    });

    const similarity = new Map<string, number>();
    for (const item of otherProfiles) {
      if (currentSet.has(item.contentId)) {
        similarity.set(item.profileId, (similarity.get(item.profileId) ?? 0) + 1);
      }
    }

    const strongestProfiles = [...similarity.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([candidateProfileId]) => candidateProfileId);

    if (strongestProfiles.length === 0) {
      return new Map();
    }

    const candidateHistory = await db.watchHistory.findMany({
      where: { profileId: { in: strongestProfiles } }
    });

    const scores = new Map<string, number>();
    for (const entry of candidateHistory) {
      if (currentSet.has(entry.contentId)) {
        continue;
      }
      const sim = similarity.get(entry.profileId) ?? 0;
      scores.set(entry.contentId, (scores.get(entry.contentId) ?? 0) + sim);
    }

    const results: StrategyResult = new Map();
    for (const [contentId, score] of scores) {
      results.set(contentId, {
        score,
        reason: "Similar viewers also watched this"
      });
    }

    return results;
  }
}

class TrendingStrategy implements RecommendationStrategy {
  weight = 0.2;

  async generate(_: string, db: PrismaClient): Promise<StrategyResult> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recent = await db.watchHistory.groupBy({
      by: ["contentId"],
      _count: { contentId: true },
      where: { lastWatchedAt: { gte: since } }
    });

    const results: StrategyResult = new Map();
    for (const row of recent) {
      results.set(row.contentId, {
        score: row._count.contentId,
        reason: "Trending this week"
      });
    }

    return results;
  }
}

export class RecommendationEngine {
  private readonly strategies: RecommendationStrategy[];

  constructor() {
    this.strategies = [
      new ContentBasedStrategy(),
      new CollaborativeFilteringStrategy(),
      new TrendingStrategy()
    ];
  }

  async generate(profileId: string, db: PrismaClient): Promise<ScoredContent[]> {
    const accumulator = new Map<string, { score: number; reasons: string[] }>();

    for (const strategy of this.strategies) {
      const partial = await strategy.generate(profileId, db);
      for (const [contentId, entry] of partial) {
        const current = accumulator.get(contentId) ?? { score: 0, reasons: [] };
        current.score += entry.score * strategy.weight;
        current.reasons.push(entry.reason);
        accumulator.set(contentId, current);
      }
    }

    if (accumulator.size === 0) {
      return [];
    }

    const contentRows = await db.content.findMany({
      where: { id: { in: [...accumulator.keys()] } }
    });

    return contentRows
      .map((content) => {
        const scoreData = accumulator.get(content.id) ?? { score: 0, reasons: [] };
        return {
          content,
          score: Number(scoreData.score.toFixed(3)),
          reason: [...new Set(scoreData.reasons)].join(" | ")
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
}
