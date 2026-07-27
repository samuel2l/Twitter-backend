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

export const interestSourceEnum = pgEnum("interest_source", [
  "onboarding",
  "inferred",
]);

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

export const userInterestRelations = relations(userInterest, ({ one }) => ({
  user: one(user, {
    fields: [userInterest.userId],
    references: [user.id],
  }),
}));
