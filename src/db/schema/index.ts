import { relations } from "drizzle-orm";
import { account, session, user } from "./auth.js";
import { post } from "./posts.js";

// One relations() per table — user links to auth + posts here
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  posts: many(post),
}));

export * from "./auth.js";
export * from "./posts.js";
