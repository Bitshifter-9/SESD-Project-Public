import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { config } from "./lib/config.js";
import { redis } from "./lib/redis.js";
import { startRecommendationWorker } from "./services/recommendationWorker.js";

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  socket.on("join-profile", (profileId: string) => {
    socket.join(`profile:${profileId}`);
  });
});

startRecommendationWorker();

server.listen(config.port, () => {
  console.log(`StreamCore API running on http://localhost:${config.port}`);
});

process.on("SIGINT", async () => {
  await redis.quit();
  server.close(() => process.exit(0));
});
