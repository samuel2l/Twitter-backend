import type { Server as HttpServer } from "node:http";
import type { WebSocketServer } from "ws";
import {
  attachWebSocketServer,
} from "./ws-server.js";
import {
  closeRealtimePubSub,
  startRealtimeSubscriber,
} from "./redis-pubsub.js";

let wss: WebSocketServer | null = null;

export async function startRealtime(server: HttpServer) {
  wss = attachWebSocketServer(server);
  await startRealtimeSubscriber();
}

export async function shutdownRealtime() {
  if (wss) {
    await new Promise<void>((resolve, reject) => {
      wss!.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    wss = null;
  }

  await closeRealtimePubSub();
}
