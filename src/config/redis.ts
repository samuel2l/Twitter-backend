import { Redis } from "ioredis";
import { env } from "./env.js";

let client: Redis | null = null;
let connectFailed = false;

function createClient(): Redis {
  const redis = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on("error", (error: Error) => {
    console.error("[redis] connection error:", error.message);
  });

  return redis;
}

export function getRedisClient(): Redis | null {
  if (!env.redisEnabled) return null;
  if (connectFailed) return null;

  if (!client) {
    client = createClient();
    client.connect().catch((error: Error) => {
      connectFailed = true;
      console.warn(
        "[redis] unavailable — running without cache:",
        error.message,
      );
    });
  }

  return client;
}

export async function closeRedis(): Promise<void> {
  if (!client) return;
  await client.quit();
  client = null;
  connectFailed = false;
}

export async function pingRedis(): Promise<"ok" | "disabled" | "unavailable"> {
  if (!env.redisEnabled) return "disabled";

  const redis = getRedisClient();
  if (!redis) return "unavailable";

  try {
    const pong = await redis.ping();
    return pong === "PONG" ? "ok" : "unavailable";
  } catch {
    return "unavailable";
  }
}
