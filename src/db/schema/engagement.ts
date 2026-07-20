import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { post } from "./posts.js";

export const interactionTypeEnum = pgEnum("interaction_type", [
  "like",
  "bookmark",
  "share",
  "view",
]);

export const interaction = pgTable(
  "interaction",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    type: interactionTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("interaction_user_post_type_uidx").on(
      table.userId,
      table.postId,
      table.type,
    ),
    index("interaction_post_id_type_idx").on(table.postId, table.type),
    index("interaction_user_id_type_idx").on(table.userId, table.type),
  ],
);

export const interactionRelations = relations(interaction, ({ one }) => ({
  user: one(user, {
    fields: [interaction.userId],
    references: [user.id],
  }),
  post: one(post, {
    fields: [interaction.postId],
    references: [post.id],
  }),
}));
