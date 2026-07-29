import { getRedisClient } from "../../../config/redis.js";

const POST_TTL_SECONDS = 10 * 60;

export type CachedPost = {
  id: string;
  [key: string]: unknown;
};

function postKey(postId: string) {
  return `post:${postId}`;
}

async function run<T>(
  operation: (redis: NonNullable<ReturnType<typeof getRedisClient>>) => Promise<T>,
): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    return await operation(redis);
  } catch (error) {
    console.error("[posts.cache]", error);
    return null;
  }
}

export const postsCache = {
  async getMany(ids: string[]): Promise<Map<string, CachedPost>> {
    if (ids.length === 0) return new Map();

    const result = await run(async (redis) => {
      const values = await redis.mget(...ids.map(postKey));
      const hits = new Map<string, CachedPost>();

      for (let i = 0; i < ids.length; i++) {
        const raw = values[i];
        const id = ids[i];
        if (raw && id) {
          hits.set(id, JSON.parse(raw) as CachedPost);
        }
      }

      return hits;
    });

    return result ?? new Map();
  },

  setMany(posts: CachedPost[]) {
    if (posts.length === 0) return Promise.resolve(null);

    return run(async (redis) => {
      const pipeline = redis.pipeline();

      for (const post of posts) {
        pipeline.set(postKey(post.id), JSON.stringify(post), "EX", POST_TTL_SECONDS);
      }

      await pipeline.exec();
    });
  },

  invalidate(postId: string) {
    return run(async (redis) => {
      await redis.del(postKey(postId));
    });
  },
};
