import crypto from "node:crypto";
import { db } from "../lib/db.js";
import { config } from "../lib/config.js";

export class TokenService {
  async generate(profileId: string, contentId: string, ttlSeconds = 3600) {
    const expiresAtEpoch = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${profileId}:${contentId}:${expiresAtEpoch}`;
    const signature = crypto
      .createHmac("sha256", config.streamSigningSecret)
      .update(payload)
      .digest("hex");

    const token = Buffer.from(`${payload}:${signature}`).toString("base64url");

    await db.streamToken.create({
      data: {
        profileId,
        contentId,
        token,
        expiresAt: new Date(expiresAtEpoch * 1000)
      }
    });

    return token;
  }

  verify(token: string) {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [profileId, contentId, expiryRaw, signature] = decoded.split(":");

    if (!profileId || !contentId || !expiryRaw || !signature) {
      return { valid: false };
    }

    const payload = `${profileId}:${contentId}:${expiryRaw}`;
    const expected = crypto
      .createHmac("sha256", config.streamSigningSecret)
      .update(payload)
      .digest("hex");

    if (expected !== signature) {
      return { valid: false };
    }

    if (Number(expiryRaw) < Math.floor(Date.now() / 1000)) {
      return { valid: false };
    }

    return {
      valid: true,
      profileId,
      contentId,
      expiresAt: new Date(Number(expiryRaw) * 1000)
    };
  }
}
