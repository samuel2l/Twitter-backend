import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../../config/env.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../../../..");

function runPythonScript(scriptName: string, args: string[]) {
  if (!env.mlEmbedEnabled) return;

  const scriptPath = path.join(projectRoot, "ml", scriptName);
  const child = spawn(env.mlPythonBin, [scriptPath, ...args], {
    detached: true,
    stdio: "ignore",
    env: process.env,
  });

  child.unref();
}

export const recommenderService = {
  schedulePostEmbedding(postId: string) {
    runPythonScript("embed_post.py", [postId]);
  },

  scheduleUserEmbedding(userId: string) {
    runPythonScript("embed_users.py", [userId]);
  },
};
