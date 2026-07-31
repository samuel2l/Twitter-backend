import type { EachMessagePayload } from "kafkajs";
import { env } from "../config/env.js";
import { postDeletedEventSchema } from "../lib/messaging/events.js";
import { handlePostDeletedSideEffects } from "../lib/modules/posts/post-deleted.side-effects.js";
import { TOPICS } from "../lib/messaging/topics.js";

export async function handlePostDeletedMessage({
  message,
}: EachMessagePayload) {
  if (!message.value) return;

  const event = postDeletedEventSchema.parse(
    JSON.parse(message.value.toString()),
  );

  if (env.nodeEnv === "development") {
    console.log(`[consumer] ${TOPICS.POST_DELETED} post=${event.postId}`);
  }

  await handlePostDeletedSideEffects(event);
}
