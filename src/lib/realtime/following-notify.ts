import type { FollowingNewPostsMessage } from "./messages.js";
import { publishUserNotifications } from "./redis-pubsub.js";

export async function notifyFollowingNewPost(
  followerIds: string[],
  payload: Pick<FollowingNewPostsMessage, "postId" | "authorId">,
) {
  if (followerIds.length === 0) return;

  await publishUserNotifications(followerIds, {
    type: "following:new_posts",
    postId: payload.postId,
    authorId: payload.authorId,
  });
}
