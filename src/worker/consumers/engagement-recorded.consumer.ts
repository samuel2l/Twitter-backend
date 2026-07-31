import type { EachMessagePayload } from "kafkajs";
import { env } from "../../config/env.js";
import {
  engagementRecordedEventSchema,
  type EngagementRecordedEvent,
} from "../../lib/messaging/events.js";
import {
  interestUpdaterAction,
} from "../../lib/ml/engagement-interest.js";
import { TOPICS } from "../../lib/messaging/topics.js";
import { runPythonScript } from "../../lib/ml/python-runner.js";

async function handleEngagement(event: EngagementRecordedEvent) {
  const interestAction = interestUpdaterAction(event);
  if (!interestAction) return;

  await runPythonScript("interest_updater.py", [
    event.userId,
    event.postId,
    interestAction,
  ]);
}

export async function handleEngagementRecordedMessage({
  message,
}: EachMessagePayload) {
  if (!message.value) return;

  const parsed = engagementRecordedEventSchema.parse(
    JSON.parse(message.value.toString()),
  );

  if (env.nodeEnv === "development") {
    console.log(
      `[worker] ${TOPICS.ENGAGEMENT_RECORDED} ${parsed.type}:${parsed.action} user=${parsed.userId}`,
    );
  }

  await handleEngagement(parsed);
}
