import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../../config/env.js";
import { recommenderRepository } from "./recommender.repository.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../../../..");

function runPythonScript(scriptName: string, args: string[]) {
  if (!env.mlEmbedEnabled) return;

  const scriptPath = path.join(projectRoot, "ml", scriptName);
  const child = spawn(env.mlPythonBin, [scriptPath, ...args], {
    detached: true,
    stdio: env.nodeEnv === "development" ? ["ignore", "pipe", "pipe"] : "ignore",
    env: {
      ...process.env,
      DATABASE_URL: env.databaseUrl,
    },
  });

  if (env.nodeEnv === "development") {
    child.stderr?.on("data", (chunk: Buffer) => {
      console.error(`[ml:${scriptName}]`, chunk.toString().trim());
    });
    child.on("error", (error) => {
      console.error(`[ml:${scriptName}] failed to start:`, error.message);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        console.error(`[ml:${scriptName}] exited with code ${code}`);
      }
    });
  }

  child.unref();
}

export const recommenderService = {
  hasUserEmbedding(userId: string) {
    return recommenderRepository.hasUserEmbedding(userId);
  },

  listForYouPostIds(userId: string, limit: number, cursor?: string) {
    return recommenderRepository.listForYouPostIds(userId, limit, cursor);
  },

  schedulePostEmbedding(postId: string) {
    runPythonScript("embed_post.py", [postId]);
  },

  scheduleUserEmbedding(userId: string) {
    runPythonScript("embed_users.py", [userId]);
  },
};
