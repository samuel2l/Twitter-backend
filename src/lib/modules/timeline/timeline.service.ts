import { postsRepository } from "../posts/posts.repository.js";
import { feedService } from "../feed/feed.service.js";
import { retrievalRepository } from "../feed/feed.repository.js";
import { buildForYouPersonalizedCandidates } from "../feed/for-you.candidates.js";
import {
  decodeForYouCursor,
  encodeForYouCursor,
  nextTier,
  type ForYouTier,
} from "../recommender/for-you.cursor.js";
import { encodeTimelineCursor } from "./timeline.cursor.js";
import { timelineRepository } from "./timeline.repository.js";

const CANDIDATE_LIMIT = 200;

type ScoredCandidate = { id: string; score: number };

function paginateOffset<T>(rows: T[], offset: number, limit: number) {
  const page = rows.slice(offset, offset + limit + 1);
  const hasMore = page.length > limit;
  const items = hasMore ? page.slice(0, limit) : page;

  return {
    items,
    nextOffset: hasMore ? offset + limit : undefined,
  };
}

async function buildTierCandidates(
  tier: ForYouTier,
  userId: string,
  sessionId: string,
): Promise<ScoredCandidate[]> {
  if (tier === "personalized") {
    return buildForYouPersonalizedCandidates(userId, sessionId);
  }

  if (tier === "exploration") {
    return retrievalRepository.listExploration(
      userId,
      sessionId,
      CANDIDATE_LIMIT,
    );
  }

  return retrievalRepository.listSeen(userId, CANDIDATE_LIMIT);
}

function paginateTimelineRows<T extends { id: string; createdAt: Date }>(
  rows: T[],
  limit: number,
) {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return {
    page,
    nextCursor:
      hasMore && last
        ? encodeTimelineCursor(last.createdAt, last.id)
        : undefined,
  };
}

export const timelineService = {
  async getFollowingFeed(userId: string, limit: number, cursor?: string) {
    const { page, nextCursor } = paginateTimelineRows(
      await timelineRepository.listFollowingPostIds(userId, limit, cursor),
      limit,
    );

    return {
      items: await postsRepository.findManyByIds(page.map((row) => row.id)),
      nextCursor,
    };
  },

  async getForYouFeed(
    userId: string,
    limit: number,
    cursor?: string,
    sessionId?: string,
    refresh?: boolean,
  ) {
    const session = await feedService.resolveForYouSession(
      userId,
      sessionId,
      refresh,
    );

    const decoded = cursor ? decodeForYouCursor(cursor) : null;
    let tier: ForYouTier = decoded?.tier ?? "personalized";
    let offset = decoded?.offset ?? 0;

    let candidates = await buildTierCandidates(tier, userId, session.id);
    let { items: pageIds, nextOffset } = paginateOffset(
      candidates,
      offset,
      limit,
    );

    while (pageIds.length === 0) {
      const upcoming = nextTier(tier);
      if (!upcoming) break;

      tier = upcoming;
      offset = 0;
      candidates = await buildTierCandidates(tier, userId, session.id);
      ({ items: pageIds, nextOffset } = paginateOffset(candidates, offset, limit));
    }

    if (pageIds.length === 0 && !cursor) {
      const { page, nextCursor } = paginateTimelineRows(
        await timelineRepository.listRecentPostIds(limit),
        limit,
      );

      return {
        items: await postsRepository.findManyByIds(page.map((row) => row.id)),
        nextCursor,
        sessionId: session.id,
        tier: "recent" as const,
        source: "recent" as const,
      };
    }

    const postIds = pageIds.map((row) => row.id);
    await feedService.recordServed(session.id, postIds);

    let nextCursor: string | undefined;
    if (nextOffset !== undefined) {
      nextCursor = encodeForYouCursor(tier, nextOffset);
    } else {
      const upcoming = nextTier(tier);
      if (upcoming) {
        nextCursor = encodeForYouCursor(upcoming, 0);
      }
    }

    return {
      items: await postsRepository.findManyByIds(postIds),
      nextCursor,
      sessionId: session.id,
      tier,
      source: tier === "personalized" ? ("recommended" as const) : tier,
    };
  },

  async getForYouNewCount(userId: string, sessionId: string) {
    const session = await feedService.resolveForYouSession(userId, sessionId);
    const count = await feedService.countRefreshableForYou(userId, session.id);
    return { count, sessionId: session.id };
  },

  async refreshForYou(userId: string) {
    const session = await feedService.resolveForYouSession(userId, undefined, true);
    return this.getForYouFeed(userId, 20, undefined, session.id, false);
  },

  recordImpressions(userId: string, postIds: string[]) {
    return feedService.recordImpressions(userId, postIds);
  },
};
