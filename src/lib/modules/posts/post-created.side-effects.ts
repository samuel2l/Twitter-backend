import type { PostCreatedEvent } from "../../messaging/events.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { followingTimelineService } from "../timeline/following-timeline.service.js";
import { runPythonScript } from "../../ml/python-runner.js";
import { postsRepository } from "./posts.repository.js";

async function notifyPostCreated(event: PostCreatedEvent) {
  if (event.type === "reply" && event.replyToId) {
    const parent = await postsRepository.findAuthorId(event.replyToId);
    if (!parent) return;

    await notificationsService.notify({
      recipientId: parent.userId,
      actorId: event.authorId,
      type: "reply",
      postId: event.replyToId,
      actorPostId: event.postId,
    });
    return;
  }

  if (
    (event.type === "quote" || event.type === "repost") &&
    event.quotedPostId
  ) {
    const quoted = await postsRepository.findAuthorId(event.quotedPostId);
    if (!quoted) return;

    await notificationsService.notify({
      recipientId: quoted.userId,
      actorId: event.authorId,
      type: event.type,
      postId: event.quotedPostId,
      actorPostId: event.postId,
    });
  }
}

export async function handlePostCreatedSideEffects(event: PostCreatedEvent) {
  if (event.isTopLevel) {
    await followingTimelineService.fanOutPost(
      event.authorId,
      event.postId,
      new Date(event.createdAt),
    );
  }

  await notifyPostCreated(event);

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
