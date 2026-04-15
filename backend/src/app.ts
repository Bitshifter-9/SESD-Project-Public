import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { TokenService } from "./services/tokenService.js";

const tokenService = new TokenService();

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan("tiny"));

  app.get("/api/health", (_, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/profiles", profileRoutes);
  app.use("/api/content", contentRoutes);
  app.use("/api/admin", adminRoutes);

  app.get("/stream/:contentId", (req, res) => {
    const token = String(req.query.token || "");
    const verified = tokenService.verify(token);

    if (!verified.valid || verified.contentId !== req.params.contentId) {
      return res.status(401).json({ error: "Invalid or expired stream token" });
    }

    return res.json({
      playback: "authorized",
      contentId: req.params.contentId,
      profileId: verified.profileId,
      expiresAt: verified.expiresAt
    });
  });

  return app;
}
