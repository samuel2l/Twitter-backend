import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { embeddingVector } from "./embeddings.js";

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
