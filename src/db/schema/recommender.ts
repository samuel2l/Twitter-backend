import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { embeddingVector } from "./embeddings.js";
import { post } from "./posts.js";

export { EMBEDDING_DIM } from "./embeddings.js";

export const postEmbedding = pgTable("post_embedding", {
  postId: text("post_id")
    .primaryKey()
    .references(() => post.id, { onDelete: "cascade" }),
  embedding: embeddingVector("embedding").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userEmbedding = pgTable("user_embedding", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  embedding: embeddingVector("embedding").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const postEmbeddingRelations = relations(postEmbedding, ({ one }) => ({
  post: one(post, {
    fields: [postEmbedding.postId],
    references: [post.id],
  }),
}));

export const userEmbeddingRelations = relations(userEmbedding, ({ one }) => ({
  user: one(user, {
    fields: [userEmbedding.userId],
    references: [user.id],
  }),
}));
