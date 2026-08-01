import { Redis } from "ioredis";
import { env } from "../../config/env.js";
import type { RealtimeOutboundMessage } from "./messages.js";
import { connectionRegistry } from "./connection-registry.js";

const USER_CHANNEL_PREFIX = "notify:user:";
const NOTIFY_PATTERN = `${USER_CHANNEL_PREFIX}*`;
const PUBLISH_BATCH = 500;

let publisher: Redis | null = null;
let subscriber: Redis | null = null;

function createRedisConnection() {
  return new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

function userChannel(userId: string) {
  return `${USER_CHANNEL_PREFIX}${userId}`;
}

function parseUserIdFromChannel(channel: string) {
  if (!channel.startsWith(USER_CHANNEL_PREFIX)) return null;
  const userId = channel.slice(USER_CHANNEL_PREFIX.length);
  return userId.length > 0 ? userId : null;
}

export async function publishUserNotification(
  userId: string,
  message: RealtimeOutboundMessage,
) {
  if (!env.redisEnabled) return;

  if (!publisher) {
    publisher = createRedisConnection();
    await publisher.connect();
  }

  await publisher.publish(userChannel(userId), JSON.stringify(message));
}

export async function publishUserNotifications(
  userIds: string[],
  message: RealtimeOutboundMessage,
) {
  if (!env.redisEnabled || userIds.length === 0) return;

  if (!publisher) {
    publisher = createRedisConnection();
    await publisher.connect();
  }

  const payload = JSON.stringify(message);

  for (let i = 0; i < userIds.length; i += PUBLISH_BATCH) {
    const batch = userIds.slice(i, i + PUBLISH_BATCH);
    const pipeline = publisher.pipeline();

    for (const userId of batch) {
      pipeline.publish(userChannel(userId), payload);
    }

    await pipeline.exec();
  }
}

export async function startRealtimeSubscriber() {
  if (!env.redisEnabled) {
    console.log("[realtime] REDIS_ENABLED is false — WebSocket push disabled");
    return;
  }

  subscriber = createRedisConnection();
  await subscriber.connect();
  await subscriber.psubscribe(NOTIFY_PATTERN);

  subscriber.on("pmessage", (_pattern, channel, payload) => {
    const userId = parseUserIdFromChannel(channel);
    if (!userId) return;

    connectionRegistry.send(userId, payload);
  });

  if (env.nodeEnv === "development") {
    console.log(`[realtime] subscribed to ${NOTIFY_PATTERN}`);
  }
}

export async function closeRealtimePubSub() {
  const tasks: Promise<unknown>[] = [];

  if (publisher) {
    tasks.push(publisher.quit());
    publisher = null;
  }

  if (subscriber) {
    tasks.push(subscriber.quit());
    subscriber = null;
  }

  await Promise.all(tasks);
}
