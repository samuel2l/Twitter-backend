import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { post } from "./posts.js";

export const feedTypeEnum = pgEnum("feed_type", ["for_you", "following"]);

//Table to track when user opened the app
export const feedSession = pgTable(
  "feed_session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    feedType: feedTypeEnum("feed_type").notNull(),
    watermarkAt: timestamp("watermark_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feed_session_user_id_feed_type_idx").on(table.userId, table.feedType),
  ],
);

//table to track when user saw a post. this way we dont show posts user has already seen 
export const feedImpression = pgTable(
  "feed_impression",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    feedType: feedTypeEnum("feed_type").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.postId, table.feedType],
    }),
    index("feed_impression_user_id_feed_type_idx").on(
      table.userId,
      table.feedType,
    ),
  ],
);

// tracks posts that were served to the user the last time he/she opened the app. In this case does not necessarily mean the post was shown to the user. that is what feedImpression table is for.
export const feedServedPost = pgTable(
  "feed_served_post",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => feedSession.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    servedAt: timestamp("served_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.postId] }),
    index("feed_served_post_session_id_idx").on(table.sessionId),
  ],
);

export const feedSessionRelations = relations(feedSession, ({ one, many }) => ({
  user: one(user, {
    fields: [feedSession.userId],
    references: [user.id],
  }),
  servedPosts: many(feedServedPost),
}));

export const feedImpressionRelations = relations(feedImpression, ({ one }) => ({
  user: one(user, {
    fields: [feedImpression.userId],
    references: [user.id],
  }),
  post: one(post, {
    fields: [feedImpression.postId],
    references: [post.id],
  }),
}));

export const feedServedPostRelations = relations(feedServedPost, ({ one }) => ({
  session: one(feedSession, {
    fields: [feedServedPost.sessionId],
    references: [feedSession.id],
  }),
  post: one(post, {
    fields: [feedServedPost.postId],
    references: [post.id],
  }),
}));
