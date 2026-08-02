import { relations } from "drizzle-orm";
import { account, session, user } from "./auth.js";
import { interaction } from "./engagement.js";
import { post } from "./posts.js";
import { follow } from "./social.js";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  posts: many(post),
  interactions: many(interaction),
  followers: many(follow, { relationName: "user_following" }),
  following: many(follow, { relationName: "user_followers" }),
}));

export * from "./auth.js";
export * from "./embeddings.js";
export * from "./posts.js";
export * from "./social.js";
export * from "./engagement.js";
export * from "./post-engagement-count.js";
export * from "./notifications.js";
export * from "./recommendation-vectors.js";
export * from "./feed.js";
