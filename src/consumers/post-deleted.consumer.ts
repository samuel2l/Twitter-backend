import type { EachMessagePayload } from "kafkajs";
import { env } from "../config/env.js";
import { postDeletedEventSchema } from "../lib/messaging/events.js";
import { TOPICS } from "../lib/messaging/topics.js";
import { runPythonScript } from "../lib/ml/python-runner.js";

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

  if (event.type === "repost" && event.quotedPostId) {
    await runPythonScript("interest_updater.py", [
      event.authorId,
      event.quotedPostId,
      "unrepost",
    ]);
  }
}
