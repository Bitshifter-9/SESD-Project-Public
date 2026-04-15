import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
import { AuthenticatedRequest } from "../types.js";

const router = Router();

router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    name: z.string().min(2),
    isChild: z.boolean().default(false)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const profile = await db.profile.create({
    data: {
      userId: req.auth!.userId,
      name: parsed.data.name,
      isChild: parsed.data.isChild
    }
  });

  return res.status(201).json(profile);
});

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const profiles = await db.profile.findMany({ where: { userId: req.auth!.userId } });
  return res.json(profiles);
});

export default router;
