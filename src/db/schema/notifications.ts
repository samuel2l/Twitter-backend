import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { post } from "./posts.js";

export const notificationTypeEnum = pgEnum("notification_type", [
  "like",
  "reply",
  "quote",
  "repost",
  "follow",
]);

export const notification = pgTable(
  "notification",
  {
    id: text("id").primaryKey(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    postId: text("post_id").references(() => post.id, {
      onDelete: "set null",
    }),
    actorPostId: text("actor_post_id").references(() => post.id, {
      onDelete: "set null",
    }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notification_recipient_id_created_at_idx").on(
      table.recipientId,
      table.createdAt,
    ),
    index("notification_recipient_id_read_at_idx").on(
      table.recipientId,
      table.readAt,
    ),
  ],
);

export const notificationRelations = relations(notification, ({ one }) => ({
  recipient: one(user, {
    fields: [notification.recipientId],
    references: [user.id],
    relationName: "notification_recipient",
  }),
  actor: one(user, {
    fields: [notification.actorId],
    references: [user.id],
    relationName: "notification_actor",
  }),
  post: one(post, {
    fields: [notification.postId],
    references: [post.id],
    relationName: "notification_post",
  }),
  actorPost: one(post, {
    fields: [notification.actorPostId],
    references: [post.id],
    relationName: "notification_actor_post",
  }),
}));
