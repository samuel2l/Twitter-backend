import type { PostDeletedEvent } from "../../messaging/events.js";
import { runPythonScript } from "../../ml/python-runner.js";
import { followingTimelineService } from "../timeline/following-timeline.service.js";

export async function handlePostDeletedSideEffects(event: PostDeletedEvent) {
  if (event.isTopLevel) {
    await followingTimelineService.removePostFromFollowers(
      event.authorId,
      event.postId,
    );
  }

  if (event.type === "repost" && event.quotedPostId) {
    await runPythonScript("interest_updater.py", [
      event.authorId,
      event.quotedPostId,
      "unrepost",
    ]);
  }
}
