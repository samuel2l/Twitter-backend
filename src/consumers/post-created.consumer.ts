import type { EachMessagePayload } from "kafkajs";
import { env } from "../config/env.js";
import { postCreatedEventSchema } from "../lib/messaging/events.js";
import { handlePostCreatedSideEffects } from "../lib/modules/posts/post-created.side-effects.js";
import { TOPICS } from "../lib/messaging/topics.js";

export async function handlePostCreatedMessage({
  message,
}: EachMessagePayload) {
  if (!message.value) return;

  const event = postCreatedEventSchema.parse(
    JSON.parse(message.value.toString()),
  );

  if (env.nodeEnv === "development") {
    console.log(`[consumer] ${TOPICS.POST_CREATED} post=${event.postId}`);
  }

  await handlePostCreatedSideEffects(event);
}
