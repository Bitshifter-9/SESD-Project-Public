import { db } from "../lib/db.js";
import { redis } from "../lib/redis.js";

const CONTENT_PREFIX = "content:by-id:";

export class ContentService {
  async list() {
    return db.content.findMany({
      include: { contentGenres: { include: { genre: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async getById(contentId: string) {
    const key = `${CONTENT_PREFIX}${contentId}`;
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const content = await db.content.findUnique({
      where: { id: contentId },
      include: { contentGenres: { include: { genre: true } } }
    });

    if (!content) {
      return null;
    }

    await redis.set(key, JSON.stringify(content), "EX", 300);
    return content;
  }
}
