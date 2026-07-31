import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { post } from "./posts.js";

export const postEngagementCount = pgTable("post_engagement_count", {
  postId: text("post_id")
    .primaryKey()
    .references(() => post.id, { onDelete: "cascade" }),
  likeCount: integer("like_count").notNull().default(0),
  bookmarkCount: integer("bookmark_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const postEngagementCountRelations = relations(
  postEngagementCount,
  ({ one }) => ({
    post: one(post, {
      fields: [postEngagementCount.postId],
      references: [post.id],
    }),
  }),
);
