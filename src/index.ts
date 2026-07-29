import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeRedis } from "./config/redis.js";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});

async function shutdown() {
  server.close();
  await closeRedis();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
