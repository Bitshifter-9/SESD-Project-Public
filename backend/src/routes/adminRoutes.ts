import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole(UserRole.ADMIN));

router.post("/content", async (req, res) => {
  const schema = z.object({
    title: z.string().min(2),
    description: z.string().min(10),
    type: z.enum(["MOVIE", "SERIES"]),
    releaseYear: z.number().int().min(1900).max(2100),
    durationMinutes: z.number().int().positive(),
    rating: z.number().min(0).max(10),
    genres: z.array(z.string().min(2)).min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const created = await db.$transaction(async (tx) => {
    const content = await tx.content.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        releaseYear: parsed.data.releaseYear,
        durationMinutes: parsed.data.durationMinutes,
        rating: parsed.data.rating
      }
    });

    for (const genreName of parsed.data.genres) {
      const genre = await tx.genre.upsert({
        where: { name: genreName },
        update: {},
        create: { name: genreName }
      });

      await tx.contentGenre.create({
        data: { contentId: content.id, genreId: genre.id }
      });
    }

    return content;
  });

  return res.status(201).json(created);
});

router.get("/analytics", async (_, res) => {
  const [users, content, subs, watch] = await Promise.all([
    db.user.count(),
    db.content.count(),
    db.subscription.groupBy({ by: ["state"], _count: { state: true } }),
    db.watchHistory.groupBy({ by: ["contentId"], _count: { contentId: true }, orderBy: { _count: { contentId: "desc" } }, take: 5 })
  ]);

  return res.json({
    totalUsers: users,
    totalContent: content,
    subscriptionDistribution: subs,
    topWatched: watch
  });
});

router.get("/health", async (_, res) => {
  const [dbHealth] = await Promise.all([db.$queryRaw`SELECT 1`]);
  return res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    dbHealth
  });
});

export default router;
