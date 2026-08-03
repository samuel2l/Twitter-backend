import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { env } from "../../config/env.js";
import { devicesRepository } from "../modules/devices/devices.repository.js";
import type { NotificationType } from "../modules/notifications/notifications.repository.js";

let initialized = false;

function pushCopy(
  type: NotificationType,
  actorName: string,
): { title: string; body: string } {
  switch (type) {
    case "like":
      return { title: "New like", body: `${actorName} liked your post` };
    case "reply":
      return { title: "New reply", body: `${actorName} replied to your post` };
    case "quote":
      return { title: "New quote", body: `${actorName} quoted your post` };
    case "repost":
      return { title: "New repost", body: `${actorName} reposted your post` };
    case "follow":
      return { title: "New follower", body: `${actorName} followed you` };
  }
}

function ensureFirebaseApp() {
  if (initialized) return true;

  if (
    !env.fcmEnabled ||
    !env.firebaseProjectId ||
    !env.firebaseClientEmail ||
    !env.firebasePrivateKey
  ) {
    return false;
  }

  try {
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: env.firebaseProjectId,
          clientEmail: env.firebaseClientEmail,
          privateKey: env.firebasePrivateKey,
        }),
      });
    }
    initialized = true;
    return true;
  } catch (error) {
    console.warn(
      "[fcm] failed to initialize firebase-admin:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

export type PushNotificationPayload = {
  recipientId: string;
  notificationId: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  postId?: string;
  actorPostId?: string;
};

/**
 * Best-effort FCM delivery. Never throws to callers — push failures
 * must not roll back the persisted notification or WebSocket path.
 */
export async function sendPushNotification(payload: PushNotificationPayload) {
  if (!ensureFirebaseApp()) return;

  const devices = await devicesRepository.listTokensByUserId(
    payload.recipientId,
  );
  if (devices.length === 0) return;

  const { title, body } = pushCopy(payload.type, payload.actorName);
  const data: Record<string, string> = {
    type: `notification:${payload.type}`,
    notificationId: payload.notificationId,
    actorId: payload.actorId,
  };
  if (payload.postId) data.postId = payload.postId;
  if (payload.actorPostId) data.actorPostId = payload.actorPostId;

  const tokens = devices.map((device) => device.token);

  try {
    const result = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    });

    const invalidCodes = new Set([
      "messaging/invalid-registration-token",
      "messaging/registration-token-not-registered",
    ]);

    await Promise.all(
      result.responses.map(async (response, index) => {
        if (response.success) return;
        const code = response.error?.code;
        if (!code || !invalidCodes.has(code)) return;

        const token = tokens[index];
        if (!token) return;
        await devicesRepository.deleteByTokenValue(token);
      }),
    );

    if (env.nodeEnv === "development") {
      const sent = result.responses.filter((r) => r.success).length;
      console.log(
        `[fcm] notified user=${payload.recipientId} sent=${sent}/${tokens.length}`,
      );
    }
  } catch (error) {
    console.error(
      "[fcm] send failed:",
      error instanceof Error ? error.message : error,
    );
  }
}
