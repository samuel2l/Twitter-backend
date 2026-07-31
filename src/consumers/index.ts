import "dotenv/config";
import { createKafkaConsumer, disconnectKafka } from "../config/kafka.js";
import { env } from "../config/env.js";
import { TOPICS } from "../lib/messaging/topics.js";
import { handleEngagementRecordedMessage } from "./engagement-recorded.consumer.js";
import { handlePostCreatedMessage } from "./post-created.consumer.js";
import { handlePostDeletedMessage } from "./post-deleted.consumer.js";

let consumer = createKafkaConsumer("twitter-ml-consumer");

async function start() {
  if (!env.kafkaEnabled) {
    console.error("[consumer] KAFKA_ENABLED is false — nothing to run");
    process.exit(1);
  }

  if (!consumer) {
    consumer = createKafkaConsumer("twitter-ml-consumer");
  }

  if (!consumer) {
    console.error("[consumer] failed to create Kafka consumer");
    process.exit(1);
  }

  await consumer.connect();
  await consumer.subscribe({
    topics: [
      TOPICS.POST_CREATED,
      TOPICS.POST_DELETED,
      TOPICS.ENGAGEMENT_RECORDED,
    ],
    fromBeginning: false,
  });

  console.log(
    `[consumer] listening on ${TOPICS.POST_CREATED}, ${TOPICS.POST_DELETED}, ${TOPICS.ENGAGEMENT_RECORDED}`,
  );

  await consumer.run({
    eachMessage: async (payload) => {
      const topic = payload.topic;

      if (topic === TOPICS.POST_CREATED) {
        await handlePostCreatedMessage(payload);
        return;
      }

      if (topic === TOPICS.POST_DELETED) {
        await handlePostDeletedMessage(payload);
        return;
      }

      if (topic === TOPICS.ENGAGEMENT_RECORDED) {
        await handleEngagementRecordedMessage(payload);
      }
    },
  });
}

async function shutdown() {
  if (consumer) {
    await consumer.disconnect();
  }
  await disconnectKafka();
  process.exit(0);
}

start().catch((error) => {
  console.error("[consumer] failed to start:", error);
  process.exit(1);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
