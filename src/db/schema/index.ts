import { relations } from "drizzle-orm";
import { account, session, user } from "./auth.js";
import { interaction } from "./engagement.js";
import { post } from "./posts.js";
import { follow } from "./social.js";

// One relations() per table — user links live here
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  posts: many(post),
  interactions: many(interaction),
  // people who follow this user
  followers: many(follow, { relationName: "user_following" }),
  // people this user follows
  following: many(follow, { relationName: "user_followers" }),
}));

export * from "./auth.js";
export * from "./posts.js";
export * from "./social.js";
export * from "./engagement.js";
export * from "./recommender.js";
