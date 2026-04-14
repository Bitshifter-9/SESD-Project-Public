import { Queue } from "bullmq";
import { RecommendationEngine } from "../domain/recommendationEngine.js";
import { config } from "../lib/config.js";
import { db } from "../lib/db.js";
import { redis } from "../lib/redis.js";

const CACHE_PREFIX = "recommendation:profile:";

export const recommendationQueue = new Queue("recommendation-jobs", {
  connection: redis
});

export class RecommendationService {
  private readonly engine = new RecommendationEngine();

  async getOrGenerate(profileId: string) {
    const key = `${CACHE_PREFIX}${profileId}`;
    const cached = await redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    const generated = await this.generate(profileId);
    await redis.set(key, JSON.stringify(generated), "EX", config.recommendationTtlSeconds);
    return generated;
  }

  async generate(profileId: string) {
    let ranked = await this.engine.generate(profileId, db);

    if (ranked.length === 0) {
      const starter = await db.content.findMany({
        orderBy: [
          { rating: "desc" },
          { createdAt: "desc" }
        ],
        take: 20
      });

      ranked = starter.map((content, index) => ({
        content,
        score: Number((1 - index * 0.03).toFixed(3)),
        reason: "Starter picks while we learn your taste"
      }));
    }

    await db.recommendation.deleteMany({ where: { profileId } });
    if (ranked.length > 0) {
      await db.recommendation.createMany({
        data: ranked.map((item) => ({
          profileId,
          contentId: item.content.id,
          score: item.score,
          generatedAt: new Date()
        }))
      });
    }

    return ranked;
  }

  async enqueueRecalculation(profileId: string) {
    await recommendationQueue.add("recompute-profile", { profileId }, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000
      },
      removeOnComplete: 100,
      removeOnFail: 200
    });
  }
}
