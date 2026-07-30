import { env } from "../../../config/env.js";
import { socialRepository } from "../social/social.repository.js";
import {
  followingTimelineCache,
  type TimelineEntry,
} from "./following-timeline.cache.js";
import { timelineRepository } from "./timeline.repository.js";

const BACKFILL_LIMIT = 200;
const FOLLOW_BACKFILL_LIMIT = 50;

async function backfillTimelineFromDb(userId: string) {
  const posts = await timelineRepository.listFollowingPostIds(
    userId,
    BACKFILL_LIMIT,
  );

  if (posts.length > 0) {
    await followingTimelineCache.addPosts(userId, posts);
  }

  return posts.length > 0;
}

export const followingTimelineService = {
  async fanOutPost(authorId: string, postId: string, createdAt: Date) {
    const followerIds = await socialRepository.listFollowerIds(authorId);
    await followingTimelineCache.addPostToTimelines(
      followerIds,
      postId,
      createdAt,
    );

    if (env.nodeEnv === "development") {
      console.log(
        `[cache:following] fan-out post=${postId} to ${followerIds.length} followers`,
      );
    }
  },

  async backfillOnFollow(followerId: string, followingId: string) {
    const posts = await timelineRepository.listTopLevelPostIdsByUser(
      followingId,
      FOLLOW_BACKFILL_LIMIT,
    );

    await followingTimelineCache.addPosts(followerId, posts);

    if (env.nodeEnv === "development") {
      console.log(
        `[cache:following] backfill ${posts.length} posts from ${followingId} → ${followerId}`,
      );
    }
  },

  async getFollowingPostIds(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<TimelineEntry[]> {
    if (!cursor) {
      const hasTimeline = await followingTimelineCache.hasTimeline(userId);
      if (hasTimeline === false) {
        await backfillTimelineFromDb(userId);
      }
    }

    const cached = await followingTimelineCache.listPostIds(
      userId,
      limit,
      cursor,
    );

    if (cached !== null) {
      if (env.nodeEnv === "development") {
        console.log(
          `[cache:following] HIT user=${userId} posts=${cached.length}`,
        );
      }
      return cached;
    }

    if (env.nodeEnv === "development") {
      console.log(`[cache:following] MISS user=${userId} → Postgres`);
    }

    return timelineRepository.listFollowingPostIds(userId, limit, cursor);
  },
};
