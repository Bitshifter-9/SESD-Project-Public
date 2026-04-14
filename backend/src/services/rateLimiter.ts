import { redis } from "../lib/redis.js";

export class DistributedRateLimiter {
  constructor(
    private readonly windowSeconds: number,
    private readonly capacity: number
  ) {}

  async allow(key: string): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - this.windowSeconds * 1000;
    const redisKey = `ratelimit:${key}`;

    const pipeline = redis.multi();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now, `${now}-${Math.random().toString(16).slice(2)}`);
    pipeline.zcard(redisKey);
    pipeline.expire(redisKey, this.windowSeconds);

    const result = await pipeline.exec();
    const currentCount = Number(result?.[2]?.[1] ?? 0);
    return currentCount <= this.capacity;
  }
}
