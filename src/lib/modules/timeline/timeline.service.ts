import { postsRepository } from "../posts/posts.repository.js";
import { encodeForYouCursor } from "../recommender/recommender.cursor.js";
import { recommenderService } from "../recommender/recommender.service.js";
import { encodeTimelineCursor } from "./timeline.cursor.js";
import { timelineRepository } from "./timeline.repository.js";

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

function paginateForYouRows(
  rows: { id: string; distance: number }[],
  limit: number,
) {
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];

  return {
    page,
    nextCursor:
      hasMore && last
        ? encodeForYouCursor(last.distance, last.id)
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

  async getForYouFeed(userId: string, limit: number, cursor?: string) {
    const hasEmbedding = await recommenderService.hasUserEmbedding(userId);

    if (!hasEmbedding) {
      const { page, nextCursor } = paginateTimelineRows(
        await timelineRepository.listRecentPostIds(limit, cursor),
        limit,
      );

      return {
        items: await postsRepository.findManyByIds(page.map((row) => row.id)),
        nextCursor,
        source: "recent" as const,
      };
    }

    const recommendedRows = await recommenderService.listForYouPostIds(
      userId,
      limit,
      cursor,
    );

    if (recommendedRows.length === 0 && !cursor) {
      const { page, nextCursor } = paginateTimelineRows(
        await timelineRepository.listRecentPostIds(limit),
        limit,
      );

      return {
        items: await postsRepository.findManyByIds(page.map((row) => row.id)),
        nextCursor,
        source: "recent" as const,
      };
    }

    const { page, nextCursor } = paginateForYouRows(recommendedRows, limit);

    return {
      items: await postsRepository.findManyByIds(page.map((row) => row.id)),
      nextCursor,
      source: "recommended" as const,
    };
  },
};
