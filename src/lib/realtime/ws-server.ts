import type { Server as HttpServer, IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { fromNodeHeaders } from "better-auth/node";
import { WebSocketServer } from "ws";
import { env } from "../../config/env.js";
import { auth } from "../modules/auth/auth.js";
import { connectionRegistry } from "./connection-registry.js";

const WS_PATH = "/ws";

function isWebSocketPath(url: string | undefined) {
  if (!url) return false;

  const pathname = new URL(url, "http://localhost").pathname;
  return pathname === WS_PATH;
}

async function authenticateUpgrade(req: IncomingMessage) {
  return auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
}

function rejectUpgrade(socket: Socket, statusCode: number, message: string) {
  socket.write(`HTTP/1.1 ${statusCode} ${message}\r\n\r\n`);
  socket.destroy();
}

function handleConnection(userId: string, ws: import("ws").WebSocket) {
  connectionRegistry.add(userId, ws);

  ws.send(JSON.stringify({ type: "connected", userId }));

  if (env.nodeEnv === "development") {
    console.log(
      `[realtime] connected user=${userId} sockets=${connectionRegistry.size()}`,
    );
  }

  ws.on("close", () => {
    connectionRegistry.remove(userId, ws);

    if (env.nodeEnv === "development") {
      console.log(
        `[realtime] disconnected user=${userId} sockets=${connectionRegistry.size()}`,
      );
    }
  });

  ws.on("error", (error) => {
    console.error(`[realtime] socket error user=${userId}:`, error.message);
  });
}

export function attachWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (!isWebSocketPath(req.url)) {
      return;
    }

    void (async () => {
      const session = await authenticateUpgrade(req);
      if (!session) {
        rejectUpgrade(socket as Socket, 401, "Unauthorized");
        return;
      }

      const userId = session.user.id;

      wss.handleUpgrade(req, socket as Socket, head, (ws) => {
        handleConnection(userId, ws);
      });
    })().catch((error) => {
      console.error("[realtime] upgrade failed:", error);
      rejectUpgrade(socket as Socket, 500, "Internal Server Error");
    });
  });

  return wss;
}
