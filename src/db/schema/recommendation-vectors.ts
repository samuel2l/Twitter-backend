import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { embeddingVector } from "./embeddings.js";
import { post } from "./posts.js";

export { EMBEDDING_DIM } from "./embeddings.js";

export const interestSourceEnum = pgEnum("interest_source", [
  "onboarding",
  "inferred",
]);

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

export const topic = pgTable("topic", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const topicEmbedding = pgTable("topic_embedding", {
  topicId: text("topic_id")
    .primaryKey()
    .references(() => topic.id, { onDelete: "cascade" }),
  embedding: embeddingVector("embedding").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userInterest = pgTable(
  "user_interest",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    source: interestSourceEnum("source").notNull(),
    embedding: embeddingVector("embedding").notNull(),
    weight: real("weight").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.source, table.label] }),
  ],
);

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

export const topicRelations = relations(topic, ({ one }) => ({
  embedding: one(topicEmbedding, {
    fields: [topic.id],
    references: [topicEmbedding.topicId],
  }),
}));

export const topicEmbeddingRelations = relations(topicEmbedding, ({ one }) => ({
  topic: one(topic, {
    fields: [topicEmbedding.topicId],
    references: [topic.id],
  }),
}));

export const userInterestRelations = relations(userInterest, ({ one }) => ({
  user: one(user, {
    fields: [userInterest.userId],
    references: [user.id],
  }),
}));
