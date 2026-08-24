import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db, pool } from "../src/db/index.js";
import { user } from "../src/db/schema/auth.js";
import { post } from "../src/db/schema/posts.js";
import { auth } from "../src/lib/modules/auth/auth.js";
import { postsRepository } from "../src/lib/modules/posts/posts.repository.js";

const PASSWORD = "11111111";
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.resolve(moduleDir, "../seed.json");

type SeedUser = {
  username: string;
  display_name: string;
  posts: string[];
};

type SeedFile = {
  users: SeedUser[];
};

function emailFor(username: string) {
  return `${username.toLowerCase()}@seed.local`;
}

async function ensureUser(entry: SeedUser) {
  const email = emailFor(entry.username);
  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true, name: true, email: true },
  });

  if (existing) {
    return { userId: existing.id, email, created: false };
  }

  const result = await auth.api.signUpEmail({
    body: {
      name: entry.display_name,
      email,
      password: PASSWORD,
    },
  });

  return { userId: result.user.id, email, created: true };
}

async function postCountFor(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(post)
    .where(and(eq(post.userId, userId), isNull(post.deletedAt)));

  return row?.count ?? 0;
}

async function main() {
  // Skip per-post embedding during seed (use postsRepository, not postsService).
  // Re-embed later with ml/embed_post.py if you need For You recommendations.
  process.env.ML_EMBED_ENABLED = "false";

  const seed = JSON.parse(readFileSync(seedPath, "utf8")) as SeedFile;

  if (!Array.isArray(seed.users) || seed.users.length === 0) {
    throw new Error("seed.json has no users");
  }

  let usersCreated = 0;
  let usersSkipped = 0;
  let postsCreated = 0;

  for (const entry of seed.users) {
    const { userId, email, created } = await ensureUser(entry);

    if (created) {
      usersCreated += 1;
      console.log(`created user ${entry.username} <${email}>`);
    } else {
      usersSkipped += 1;
      console.log(`existing user ${entry.username} <${email}>`);
    }

    const existingPosts = await postCountFor(userId);
    if (existingPosts > 0) {
      console.log(`  skip posts (already has ${existingPosts})`);
      continue;
    }

    for (const text of entry.posts) {
      const createdPost = await postsRepository.create(
        userId,
        { type: "original", text },
        null,
      );
      if (!createdPost) {
        throw new Error(`failed to create post for ${entry.username}`);
      }
      postsCreated += 1;
    }

    console.log(`  + ${entry.posts.length} posts`);
  }

  console.log(
    `\nDone. users created=${usersCreated} skipped=${usersSkipped} posts=${postsCreated}`,
  );
  console.log(`All seeded accounts use password: ${PASSWORD}`);
  console.log("Emails look like: alphacoder@seed.local");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
