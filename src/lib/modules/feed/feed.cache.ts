import { getRedisClient } from "../../../config/redis.js";
import type { ForYouTier } from "../recommender/for-you.cursor.js";
import type { ScoredCandidate } from "./for-you.candidates.js";

const SESSION_TTL_SECONDS = 24 * 60 * 60;


//redis layer for feed cache
// Without Redis, every time a user scrolls the feed, the app re-runs vector queries against Postgres to rebuild up to 200 candidate posts. With this file, you:

// Build candidates once per session + tier → store in Redis
// Paginate from memory on later pages (slice the cached list)
// Track served posts in Redis for fast blue-dot counts

//helpers to consistently name keys for storage
function tierKey(sessionId: string, tier: ForYouTier) {
  return `feed:session:${sessionId}:tier:${tier}`;
}

function servedKey(sessionId: string) {
  return `feed:session:${sessionId}:served`;
}

async function run<T>(
  operation: (redis: NonNullable<ReturnType<typeof getRedisClient>>) => Promise<T>,
): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    return await operation(redis);
  } catch (error) {
    console.error("[feed.cache]", error);
    return null;
  }
}

export const feedCache = {
  getTierCandidates(sessionId: string, tier: ForYouTier) {
    return run(async (redis) => {
      const raw = await redis.get(tierKey(sessionId, tier));
      if (!raw) return null;
      return JSON.parse(raw) as ScoredCandidate[];
    });
  },

  setTierCandidates(
    sessionId: string,
    tier: ForYouTier,
    candidates: ScoredCandidate[],
  ) {
    return run(async (redis) => {
      await redis.set(
        tierKey(sessionId, tier),
        JSON.stringify(candidates),
        "EX",
        SESSION_TTL_SECONDS,
      );
    });
  },

  addServedPosts(sessionId: string, postIds: string[]) {
    if (postIds.length === 0) return Promise.resolve(null);

    return run(async (redis) => {
      const key = servedKey(sessionId);
      await redis.sadd(key, ...postIds);
      await redis.expire(key, SESSION_TTL_SECONDS);
    });
  },

  getServedPostIds(sessionId: string) {
    return run(async (redis) => {
      return redis.smembers(servedKey(sessionId));
    });
  },

  async countUnserved(
    sessionId: string,
    candidates: ScoredCandidate[],
    servedPostIds: string[],
  ) {
    if (candidates.length === 0) return 0;

    const cachedServed = await this.getServedPostIds(sessionId);
    const served = new Set(cachedServed ?? servedPostIds);

    return candidates.filter((candidate) => !served.has(candidate.id)).length;
  },
};
