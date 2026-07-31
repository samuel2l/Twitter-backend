import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { getKafkaProducer } from "../../config/kafka.js";
import type {
  EngagementRecordedEvent,
  PostCreatedEvent,
} from "./events.js";
import {
  interestUpdaterAction,
} from "../ml/engagement-interest.js";
import { TOPICS } from "./topics.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(moduleDir, "../../..");

//fallback for kafka
function runPythonScriptDetached(scriptName: string, args: string[]) {
  if (!env.mlEmbedEnabled) return;

  const scriptPath = path.join(projectRoot, "ml", scriptName);
  const child = spawn(env.mlPythonBin, [scriptPath, ...args], {
    detached: true,
    stdio:
      env.nodeEnv === "development" ? ["ignore", "pipe", "pipe"] : "ignore",
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


function handleEngagementFallback(event: EngagementRecordedEvent) {
  if (!env.mlEmbedEnabled) return;

  const interestAction = interestUpdaterAction(event);
  if (interestAction) {
    runPythonScriptDetached("interest_updater.py", [
      event.userId,
      event.postId,
      interestAction,
    ]);
  }
}

async function publish(topic: string, key: string, value: unknown) {
  const producer = await getKafkaProducer();
  if (!producer) return false;

  await producer.send({
    topic,
    messages: [
      {
        key,
        value: JSON.stringify(value),
      },
    ],
  });

  return true;
}

export const eventPublisher = {
  async publishPostCreated(event: PostCreatedEvent) {
    if (env.kafkaEnabled) {
      const published = await publish(TOPICS.POST_CREATED, event.authorId, event);
      if (published) {
        if (env.nodeEnv === "development") {
          console.log(`[kafka] published ${TOPICS.POST_CREATED} post=${event.postId}`);
        }
        return;
      }
    }

    if (event.type === "repost") {
      if (event.quotedPostId) {
        runPythonScriptDetached("interest_updater.py", [
          event.authorId,
          event.quotedPostId,
          "repost",
        ]);
      }
      return;
    }

    runPythonScriptDetached("embed_post.py", [event.postId]);
  },

  async publishEngagementRecorded(event: EngagementRecordedEvent) {
    if (env.kafkaEnabled) {
      const published = await publish(
        TOPICS.ENGAGEMENT_RECORDED,
        event.userId,
        event,
      );
      if (published) {
        if (env.nodeEnv === "development") {
          console.log(
            `[kafka] published ${TOPICS.ENGAGEMENT_RECORDED} ${event.type}:${event.action}`,
          );
        }
        return;
      }
    }

    handleEngagementFallback(event);
  },
};
