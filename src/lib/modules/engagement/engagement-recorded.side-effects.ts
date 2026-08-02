import type { EngagementRecordedEvent } from "../../messaging/events.js";
import { applyEngagementCountDelta } from "../engagement/engagement-counts.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { postsRepository } from "../posts/posts.repository.js";
import { interestUpdaterAction } from "../../ml/engagement-interest.js";
import { runPythonScript } from "../../ml/python-runner.js";

async function notifyEngagement(event: EngagementRecordedEvent) {
  if (event.action !== "add" || event.type !== "like") return;

  const target = await postsRepository.findAuthorId(event.postId);
  if (!target) return;

  await notificationsService.notify({
    recipientId: target.userId,
    actorId: event.userId,
    type: "like",
    postId: event.postId,
  });
}

export async function handleEngagementRecordedSideEffects(
  event: EngagementRecordedEvent,
) {
  await applyEngagementCountDelta(event);
  await notifyEngagement(event);

  const interestAction = interestUpdaterAction(event);
  if (!interestAction) return;

  await runPythonScript("interest_updater.py", [
    event.userId,
    event.postId,
    interestAction,
  ]);
}
