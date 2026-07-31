import type { PostCreatedEvent } from "../../messaging/events.js";
import { followingTimelineService } from "../timeline/following-timeline.service.js";
import { runPythonScript } from "../../ml/python-runner.js";

export async function handlePostCreatedSideEffects(event: PostCreatedEvent) {
  if (event.isTopLevel) {
    await followingTimelineService.fanOutPost(
      event.authorId,
      event.postId,
      new Date(event.createdAt),
    );
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
