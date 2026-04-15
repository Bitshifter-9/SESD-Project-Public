import { Router } from "express";
import { z } from "zod";
import { DistributedRateLimiter } from "../services/rateLimiter.js";
import { ContentService } from "../services/contentService.js";
import { SubscriptionService } from "../services/subscriptionService.js";
import { TokenService } from "../services/tokenService.js";
import { WatchService } from "../services/watchService.js";
import { RecommendationService } from "../services/recommendationService.js";
import { requireAuth } from "../middleware/auth.js";
import { AuthenticatedRequest } from "../types.js";

const router = Router();
const contentService = new ContentService();
const subscriptionService = new SubscriptionService();
const tokenService = new TokenService();
const watchService = new WatchService();
const recommendationService = new RecommendationService();
const playbackLimiter = new DistributedRateLimiter(60, 50);

router.get("/", async (_, res) => {
  const content = await contentService.list();
  return res.json(content);
});

router.post("/play/:contentId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({ profileId: z.string().min(3) });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const allowed = await playbackLimiter.allow(`${req.auth!.userId}:playback`);
  if (!allowed) {
    return res.status(429).json({ error: "Too many playback requests" });
  }

  try {
    const subscription = await subscriptionService.getActiveSubscription(req.auth!.userId);
    if (!subscription.canStream) {
      return res.status(402).json({ error: `Subscription not streamable in state ${subscription.state}` });
    }

    const content = await contentService.getById(req.params.contentId);
    if (!content) {
      return res.status(404).json({ error: "Content not found" });
    }

    const token = await tokenService.generate(parsed.data.profileId, content.id);
    return res.json({
      streamUrl: `/stream/${content.id}?token=${token}`,
      tokenExpiresInSeconds: 3600
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

router.post("/watch-progress", requireAuth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    profileId: z.string().min(3),
    contentId: z.string().min(3),
    watchedDurationSeconds: z.number().min(0)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const record = await watchService.updateProgress(
      parsed.data.profileId,
      parsed.data.contentId,
      parsed.data.watchedDurationSeconds
    );
    await recommendationService.enqueueRecalculation(parsed.data.profileId);
    return res.json(record);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

router.get("/continue-watching/:profileId", requireAuth, async (req, res) => {
  const items = await watchService.getContinueWatching(req.params.profileId);
  return res.json(items);
});

router.get("/recommendations/:profileId", requireAuth, async (req, res) => {
  const data = await recommendationService.getOrGenerate(req.params.profileId);
  return res.json(data);
});

export default router;
