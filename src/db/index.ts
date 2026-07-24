import { drizzle } from "drizzle-orm/node-postgres";
import pgvector from "pgvector/pg";
import { Pool } from "pg";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on("connect", async (client) => {
  await pgvector.registerType(client);
});

export const db = drizzle(pool, { schema });
