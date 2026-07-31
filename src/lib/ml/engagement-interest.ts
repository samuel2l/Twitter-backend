import type { EngagementRecordedEvent } from "../messaging/events.js";

// Maps an engagement event to the action string expected by interest_updater.py 
export function interestUpdaterAction(
  event: EngagementRecordedEvent,
): string | null {
  if (event.action === "add") {
    if (
      event.type === "like" ||
      event.type === "bookmark" ||
      event.type === "share" ||
      event.type === "not_interested"
    ) {
      return event.type;
    }
    return null;
  }

  if (event.action === "remove") {
    if (event.type === "like") return "unlike";
    if (event.type === "bookmark") return "unbookmark";
  }

  return null;
}
