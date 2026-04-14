import { Worker } from "bullmq";
import { db } from "../lib/db.js";
import { redis } from "../lib/redis.js";
import { RecommendationService } from "./recommendationService.js";

export function startRecommendationWorker() {
  const service = new RecommendationService();

  const worker = new Worker(
    "recommendation-jobs",
    async (job) => {
      const profileId = String(job.data.profileId);
      await db.job.create({
        data: {
          type: "recommendation",
          status: "PROCESSING",
          payload: { profileId },
          attempts: job.attemptsMade,
          scheduledAt: new Date()
        }
      });

      await service.generate(profileId);
    },
    { connection: redis }
  );

  worker.on("failed", async (job, error) => {
    await db.job.create({
      data: {
        type: "recommendation",
        status: "FAILED",
        payload: { profileId: job?.data.profileId, message: error.message },
        attempts: job?.attemptsMade ?? 0,
        scheduledAt: new Date(),
        processedAt: new Date()
      }
    });
  });

  return worker;
}
