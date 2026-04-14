import { db } from "../lib/db.js";

export class WatchService {
  async updateProgress(profileId: string, contentId: string, watchedDurationSeconds: number) {
    const content = await db.content.findUnique({ where: { id: contentId } });
    if (!content) {
      throw new Error("Content not found");
    }

    const completed = watchedDurationSeconds >= content.durationMinutes * 60 * 0.95;

    return db.watchHistory.upsert({
      where: { profileId_contentId: { profileId, contentId } },
      update: {
        watchedDurationSeconds,
        completed,
        lastWatchedAt: new Date()
      },
      create: {
        profileId,
        contentId,
        watchedDurationSeconds,
        completed
      }
    });
  }

  async getContinueWatching(profileId: string) {
    return db.watchHistory.findMany({
      where: {
        profileId,
        completed: false
      },
      include: { content: true },
      orderBy: { lastWatchedAt: "desc" },
      take: 20
    });
  }
}
