import type { EachMessagePayload } from "kafkajs";
import { env } from "../config/env.js";
import { engagementRecordedEventSchema } from "../lib/messaging/events.js";
import { handleEngagementRecordedSideEffects } from "../lib/modules/engagement/engagement-recorded.side-effects.js";
import { TOPICS } from "../lib/messaging/topics.js";

export async function handleEngagementRecordedMessage({
  message,
}: EachMessagePayload) {
  if (!message.value) return;

  const parsed = engagementRecordedEventSchema.parse(
    JSON.parse(message.value.toString()),
  );

  if (env.nodeEnv === "development") {
    console.log(
      `[consumer] ${TOPICS.ENGAGEMENT_RECORDED} ${parsed.type}:${parsed.action} user=${parsed.userId}`,
    );
  }

  await handleEngagementRecordedSideEffects(parsed);
}
