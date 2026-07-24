import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { follow, post } from "../../../db/schema/index.js";
import { decodeTimelineCursor } from "./timeline.cursor.js";

export const timelineRepository = {
  async listFollowingPostIds(
    userId: string,
    limit: number,
    cursor?: string,
  ) {
    const conditions = [
      eq(follow.followerId, userId),
      isNull(post.deletedAt),
      isNull(post.replyToId),
    ];

    if (cursor) {
      const decoded = decodeTimelineCursor(cursor);
      if (decoded) {
        conditions.push(
          or(
            lt(post.createdAt, decoded.createdAt),
            and(
              eq(post.createdAt, decoded.createdAt),
              lt(post.id, decoded.id),
            ),
          )!,
        );
      }
    }

    return db
      .select({ id: post.id, createdAt: post.createdAt })
      .from(post)
      .innerJoin(follow, eq(follow.followingId, post.userId))
      .where(and(...conditions))
      .orderBy(desc(post.createdAt), desc(post.id))
      .limit(limit + 1);
  },

  async listRecentPostIds(limit: number, cursor?: string) {
    const conditions = [isNull(post.deletedAt), isNull(post.replyToId)];

    if (cursor) {
      const decoded = decodeTimelineCursor(cursor);
      if (decoded) {
        conditions.push(
          or(
            lt(post.createdAt, decoded.createdAt),
            and(
              eq(post.createdAt, decoded.createdAt),
              lt(post.id, decoded.id),
            ),
          )!,
        );
      }
    }

    return db
      .select({ id: post.id, createdAt: post.createdAt })
      .from(post)
      .where(and(...conditions))
      .orderBy(desc(post.createdAt), desc(post.id))
      .limit(limit + 1);
  },
};
