import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  interaction,
  post,
  postEngagementCount,
} from "../../../db/schema/index.js";

export type InteractionType =
  | "like"
  | "bookmark"
  | "share"
  | "view"
  | "not_interested";

type CountedInteractionType = "like" | "bookmark" | "share" | "view";

export const engagementRepository = {
  findPostById(postId: string) {
    return db.query.post.findFirst({
      where: and(eq(post.id, postId), isNull(post.deletedAt)),
      columns: { id: true },
    });
  },

  findInteraction(userId: string, postId: string, type: InteractionType) {
    return db.query.interaction.findFirst({
      where: and(
        eq(interaction.userId, userId),
        eq(interaction.postId, postId),
        eq(interaction.type, type),
      ),
    });
  },

  createInteraction(userId: string, postId: string, type: InteractionType) {
    return db
      .insert(interaction)
      .values({
        id: crypto.randomUUID(),
        userId,
        postId,
        type,
      })
      .returning();
  },

  deleteInteraction(userId: string, postId: string, type: InteractionType) {
    return db
      .delete(interaction)
      .where(
        and(
          eq(interaction.userId, userId),
          eq(interaction.postId, postId),
          eq(interaction.type, type),
        ),
      )
      .returning();
  },

  listForUserOnPost(userId: string, postId: string) {
    return db.query.interaction.findMany({
      where: and(
        eq(interaction.userId, userId),
        eq(interaction.postId, postId),
      ),
      columns: { type: true, createdAt: true },
    });
  },

  countByPost(postId: string, type: InteractionType) {
    return db
      .select({ count: sql<number>`count(*)::int` })
      .from(interaction)
      .where(
        and(eq(interaction.postId, postId), eq(interaction.type, type)),
      );
  },

  findCountsByPostId(postId: string) {
    return db.query.postEngagementCount.findFirst({
      where: eq(postEngagementCount.postId, postId),
      columns: {
        likeCount: true,
        bookmarkCount: true,
        shareCount: true,
        viewCount: true,
      },
    });
  },

  async adjustCount(
    postId: string,
    type: CountedInteractionType,
    delta: 1 | -1,
  ) {
    const increment = delta === 1;
    const initial = increment ? 1 : 0;

    await db
      .insert(postEngagementCount)
      .values({
        postId,
        likeCount: type === "like" ? initial : 0,
        bookmarkCount: type === "bookmark" ? initial : 0,
        shareCount: type === "share" ? initial : 0,
        viewCount: type === "view" ? initial : 0,
      })
      .onConflictDoUpdate({
        target: postEngagementCount.postId,
        set: {
          ...(type === "like" && {
            likeCount: increment
              ? sql`${postEngagementCount.likeCount} + 1`
              : sql`GREATEST(0, ${postEngagementCount.likeCount} - 1)`,
          }),
          ...(type === "bookmark" && {
            bookmarkCount: increment
              ? sql`${postEngagementCount.bookmarkCount} + 1`
              : sql`GREATEST(0, ${postEngagementCount.bookmarkCount} - 1)`,
          }),
          ...(type === "share" && {
            shareCount: increment
              ? sql`${postEngagementCount.shareCount} + 1`
              : sql`GREATEST(0, ${postEngagementCount.shareCount} - 1)`,
          }),
          ...(type === "view" && {
            viewCount: increment
              ? sql`${postEngagementCount.viewCount} + 1`
              : sql`GREATEST(0, ${postEngagementCount.viewCount} - 1)`,
          }),
          updatedAt: new Date(),
        },
      });
  },
};
