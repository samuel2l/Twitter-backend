import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const postTypeEnum = pgEnum("post_type", [
  "original",
  "reply",
  "quote",
  "repost",
]);

export const mediaTypeEnum = pgEnum("media_type", ["image", "video"]);

export const post = pgTable(
  "post",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    text: text("text"),
    type: postTypeEnum("type").notNull(),
    replyToId: text("reply_to_id").references((): AnyPgColumn => post.id, {
      onDelete: "set null",
    }),
    quotedPostId: text("quoted_post_id").references((): AnyPgColumn => post.id, {
      onDelete: "set null",
    }),
    rootId: text("root_id").references((): AnyPgColumn => post.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("post_user_id_created_at_idx").on(table.userId, table.createdAt),
    index("post_reply_to_id_created_at_idx").on(
      table.replyToId,
      table.createdAt,
    ),
    index("post_feed_idx").on(table.deletedAt, table.replyToId, table.createdAt),
  ],
);

export const postMedia = pgTable(
  "post_media",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    type: mediaTypeEnum("type").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("post_media_post_id_sort_order_idx").on(table.postId, table.sortOrder),
  ],
);

// Joins: so when we query a post, returned data can include related tables (author, media, etc.)
//
// relationName pairs both sides of the same self-link when post has multiple FKs to itself.
// Same name on both ends of one pair; different name per kind of link.
// Example — "post_quotes":
//   quotedPost = the one post this post is quoting (via quotedPostId)
//   quotes     = all posts that quote this post
export const postRelations = relations(post, ({ one, many }) => ({
  author: one(user, {
    fields: [post.userId],
    references: [user.id],
  }),
  replyTo: one(post, {
    fields: [post.replyToId],
    references: [post.id],
    relationName: "post_replies",
  }),
  replies: many(post, {
    relationName: "post_replies",
  }),
  quotedPost: one(post, {
    fields: [post.quotedPostId],
    references: [post.id],
    relationName: "post_quotes",
  }),
  quotes: many(post, {
    relationName: "post_quotes",
  }),
  root: one(post, {
    fields: [post.rootId],
    references: [post.id],
    relationName: "post_thread",
  }),
  thread: many(post, {
    relationName: "post_thread",
  }),
  media: many(postMedia),
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(post, {
    fields: [postMedia.postId],
    references: [post.id],
  }),
}));
