import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { interaction, post } from "../../../db/schema/index.js";

export type InteractionType = "like" | "bookmark" | "share" | "view";

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
};
