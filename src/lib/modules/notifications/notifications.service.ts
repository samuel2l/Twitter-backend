import { publishUserNotification } from "../../realtime/redis-pubsub.js";
import {
  notificationsRepository,
  type CreateNotificationInput,
  type NotificationType,
} from "./notifications.repository.js";

const wsTypeByNotification: Record<
  NotificationType,
  | "notification:like"
  | "notification:reply"
  | "notification:quote"
  | "notification:repost"
  | "notification:follow"
> = {
  like: "notification:like",
  reply: "notification:reply",
  quote: "notification:quote",
  repost: "notification:repost",
  follow: "notification:follow",
};

export class NotificationsServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "NotificationsServiceError";
  }
}

export const notificationsService = {
  async notify(input: CreateNotificationInput) {
    if (input.recipientId === input.actorId) return null;

    const [created] = await notificationsRepository.create(input);
    if (!created) return null;

    await publishUserNotification(input.recipientId, {
      type: wsTypeByNotification[input.type],
      notificationId: created.id,
      actorId: input.actorId,
      postId: input.postId,
      actorPostId: input.actorPostId,
    });

    return created;
  },

  async list(recipientId: string, limit: number) {
    const rows = await notificationsRepository.listForRecipient(
      recipientId,
      limit,
    );
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    };
  },

  async unreadCount(recipientId: string) {
    const [row] = await notificationsRepository.countUnread(recipientId);
    return { count: row?.count ?? 0 };
  },

  async markRead(recipientId: string, notificationId: string) {
    const updated = await notificationsRepository.markRead(
      recipientId,
      notificationId,
    );
    if (updated.length === 0) {
      throw new NotificationsServiceError("notification not found", 404);
    }
  },

  async markAllRead(recipientId: string) {
    await notificationsRepository.markAllRead(recipientId);
  },
};
