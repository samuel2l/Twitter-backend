import { getRedisClient } from "../../../config/redis.js";
import { decodeTimelineCursor } from "./timeline.cursor.js";

const TIMELINE_MAX_LENGTH = 1000;
const FANOUT_PIPELINE_BATCH = 500;

export type TimelineEntry = { id: string; createdAt: Date };

function timelineKey(userId: string) {
  return `following:timeline:${userId}`;
}

async function run<T>(
  operation: (redis: NonNullable<ReturnType<typeof getRedisClient>>) => Promise<T>,
): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    return await operation(redis);
  } catch (error) {
    console.error("[following-timeline.cache]", error);
    return null;
  }
}

function parseWithScores(raw: string[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (let i = 0; i < raw.length; i += 2) {
    const id = raw[i];
    const score = raw[i + 1];
    if (!id || score === undefined) continue;

    entries.push({
      id,
      createdAt: new Date(Number(score)),
    });
  }

  return entries;
}

function sortTimelineEntries(entries: TimelineEntry[]) {
  entries.sort((a, b) => {
    const byTime = b.createdAt.getTime() - a.createdAt.getTime();
    if (byTime !== 0) return byTime;
    return b.id.localeCompare(a.id);
  });
}

function dedupeTimelineEntries(entries: TimelineEntry[]) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

export const followingTimelineCache = {
  hasTimeline(userId: string) {
    return run(async (redis) => {
      const count = await redis.zcard(timelineKey(userId));
      return count > 0;
    });
  },

  async addPosts(userId: string, posts: TimelineEntry[]) {
    if (posts.length === 0) return;

    await run(async (redis) => {
      const key = timelineKey(userId);
      const pipeline = redis.pipeline();

      for (const post of posts) {
        pipeline.zadd(key, post.createdAt.getTime(), post.id);
      }

      pipeline.zremrangebyrank(key, 0, -(TIMELINE_MAX_LENGTH + 1));
      await pipeline.exec();
    });
  },

  async addPostToTimelines(
    followerIds: string[],
    postId: string,
    createdAt: Date,
  ) {
    if (followerIds.length === 0) return;

    const score = createdAt.getTime();

    await run(async (redis) => {
      for (let i = 0; i < followerIds.length; i += FANOUT_PIPELINE_BATCH) {
        const batch = followerIds.slice(i, i + FANOUT_PIPELINE_BATCH);
        const pipeline = redis.pipeline();

        for (const followerId of batch) {
          const key = timelineKey(followerId);
          pipeline.zadd(key, score, postId);
          pipeline.zremrangebyrank(key, 0, -(TIMELINE_MAX_LENGTH + 1));
        }

        await pipeline.exec();
      }
    });
  },

  async removePostFromTimelines(followerIds: string[], postId: string) {
    if (followerIds.length === 0) return;

    await run(async (redis) => {
      for (let i = 0; i < followerIds.length; i += FANOUT_PIPELINE_BATCH) {
        const batch = followerIds.slice(i, i + FANOUT_PIPELINE_BATCH);
        const pipeline = redis.pipeline();

        for (const followerId of batch) {
          pipeline.zrem(timelineKey(followerId), postId);
        }

        await pipeline.exec();
      }
    });
  },

  listPostIds(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<TimelineEntry[] | null> {
    return run(async (redis) => {
      const key = timelineKey(userId);
      const fetchCount = limit + 20;
      let entries: TimelineEntry[] = [];

      if (!cursor) {
        entries = parseWithScores(
          await redis.zrevrange(key, 0, limit, "WITHSCORES"),
        );
      } else {
        const decoded = decodeTimelineCursor(cursor);
        if (!decoded) {
          entries = parseWithScores(
            await redis.zrevrange(key, 0, limit, "WITHSCORES"),
          );
        } else {
          const score = decoded.createdAt.getTime();
          const older = parseWithScores(
            await redis.zrevrangebyscore(
              key,
              `(${score}`,
              "-inf",
              "WITHSCORES",
              "LIMIT",
              0,
              fetchCount,
            ),
          );
          const sameTime = parseWithScores(
            await redis.zrevrangebyscore(key, score, score, "WITHSCORES"),
          ).filter((entry) => entry.id < decoded.id);

          entries = dedupeTimelineEntries([...sameTime, ...older]);
          sortTimelineEntries(entries);
        }
      }

      return entries.slice(0, limit + 1);
    });
  },
};
