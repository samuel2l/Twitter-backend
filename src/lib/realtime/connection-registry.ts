import type { WebSocket } from "ws";

const connections = new Map<string, Set<WebSocket>>();

export const connectionRegistry = {
  add(userId: string, socket: WebSocket) {
    const existing = connections.get(userId);
    if (existing) {
      existing.add(socket);
      return;
    }

    connections.set(userId, new Set([socket]));
  },

  remove(userId: string, socket: WebSocket) {
    const existing = connections.get(userId);
    if (!existing) return;

    existing.delete(socket);
    if (existing.size === 0) {
      connections.delete(userId);
    }
  },

  send(userId: string, payload: string) {
    const sockets = connections.get(userId);
    if (!sockets || sockets.size === 0) return 0;

    let delivered = 0;
    for (const socket of sockets) {
      if (socket.readyState !== socket.OPEN) continue;
      socket.send(payload);
      delivered += 1;
    }

    return delivered;
  },

  size() {
    let total = 0;
    for (const sockets of connections.values()) {
      total += sockets.size;
    }
    return total;
  },
};
