import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  jwtSecret: required("JWT_SECRET"),
  streamSigningSecret: required("STREAM_SIGNING_SECRET"),
  redisUrl: required("REDIS_URL"),
  recommendationTtlSeconds: Number(process.env.RECOMMENDATION_TTL_SECONDS ?? 300),
  defaultSessionTtlHours: Number(process.env.DEFAULT_SESSION_TTL_HOURS ?? 24)
};
