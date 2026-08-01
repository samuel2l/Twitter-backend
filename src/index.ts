import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeRedis } from "./config/redis.js";
import { disconnectKafka } from "./config/kafka.js";
import { shutdownRealtime, startRealtime } from "./lib/realtime/index.js";

const app = createApp();
const server = createServer(app);

await startRealtime(server);

server.listen(env.port, () => {
  console.log(`Server listening on ${env.betterAuthUrl}`);
  console.log(`WebSocket available at ${env.websocketUrl}`);
});

async function shutdown() {
  server.close();
  await Promise.all([shutdownRealtime(), closeRedis(), disconnectKafka()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
