import { Router } from "express";
import { z } from "zod";
import { AuthService } from "../services/authService.js";

const authService = new AuthService();
const router = Router();

router.post("/register", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const user = await authService.register(parsed.data.email, parsed.data.password);
    return res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role
    });
  } catch (error) {
    return res.status(409).json({ error: (error as Error).message });
  }
});

router.post("/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    deviceInfo: z.string().min(2)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const result = await authService.login({
      ...parsed.data,
      ipAddress: req.ip || "0.0.0.0"
    });
    return res.json(result);
  } catch (error) {
    return res.status(401).json({ error: (error as Error).message });
  }
});

export default router;
