import type { EngagementRecordedEvent } from "../../messaging/events.js";
import { engagementRepository } from "./engagement.repository.js";

export async function applyEngagementCountDelta(
  event: EngagementRecordedEvent,
) {
  if (event.type === "not_interested") return;
  if (event.type === "view" && event.action === "remove") return;

  const delta = event.action === "add" ? 1 : -1;
  await engagementRepository.adjustCount(event.postId, event.type, delta);
}
