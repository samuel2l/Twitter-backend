import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../../..");

export function runPythonScript(scriptName: string, args: string[]) {
  if (!env.mlEmbedEnabled) return Promise.resolve();

  const scriptPath = path.join(projectRoot, "ml", scriptName);

  return new Promise<void>((resolve, reject) => {
    const child = spawn(env.mlPythonBin, [scriptPath, ...args], {
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
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code ?? "unknown"}`));
    });
  });
}
