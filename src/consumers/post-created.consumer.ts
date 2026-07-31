import type { EachMessagePayload } from "kafkajs";
import { env } from "../config/env.js";
import { postCreatedEventSchema } from "../lib/messaging/events.js";
import { TOPICS } from "../lib/messaging/topics.js";
import { runPythonScript } from "../lib/ml/python-runner.js";

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

  if (event.type === "repost") {
    if (event.quotedPostId) {
      await runPythonScript("interest_updater.py", [
        event.authorId,
        event.quotedPostId,
        "repost",
      ]);
    }
    return;
  }

  await runPythonScript("embed_post.py", [event.postId]);
}
