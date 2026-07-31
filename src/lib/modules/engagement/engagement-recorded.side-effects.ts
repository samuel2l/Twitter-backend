import type { EngagementRecordedEvent } from "../../messaging/events.js";
import { applyEngagementCountDelta } from "../engagement/engagement-counts.js";
import { interestUpdaterAction } from "../../ml/engagement-interest.js";
import { runPythonScript } from "../../ml/python-runner.js";

export async function handleEngagementRecordedSideEffects(
  event: EngagementRecordedEvent,
) {
  await applyEngagementCountDelta(event);

  const interestAction = interestUpdaterAction(event);
  if (!interestAction) return;

  await runPythonScript("interest_updater.py", [
    event.userId,
    event.postId,
    interestAction,
  ]);
}
