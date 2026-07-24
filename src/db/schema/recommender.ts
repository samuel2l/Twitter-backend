import { relations } from "drizzle-orm";
import { customType, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { post } from "./posts.js";

export const EMBEDDING_DIM = 384;

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return `vector(${EMBEDDING_DIM})`;
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string) {
    return value
      .slice(1, -1)
      .split(",")
      .map((part) => Number(part));
  },
});

export const postEmbedding = pgTable("post_embedding", {
  postId: text("post_id")
    .primaryKey()
    .references(() => post.id, { onDelete: "cascade" }),
  embedding: vector("embedding").notNull(),
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
  embedding: vector("embedding").notNull(),
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
