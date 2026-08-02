import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { notification } from "../../../db/schema/index.js";

export type NotificationType = "like" | "reply" | "quote" | "repost" | "follow";

export type CreateNotificationInput = {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  postId?: string;
  actorPostId?: string;
};

export const notificationsRepository = {
  create(input: CreateNotificationInput) {
    return db
      .insert(notification)
      .values({
        id: crypto.randomUUID(),
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        postId: input.postId ?? null,
        actorPostId: input.actorPostId ?? null,
      })
      .returning();
  },

  listForRecipient(recipientId: string, limit: number) {
    return db.query.notification.findMany({
      where: eq(notification.recipientId, recipientId),
      with: {
        actor: {
          columns: { id: true, name: true, image: true },
        },
      },
      orderBy: [desc(notification.createdAt), desc(notification.id)],
      limit: limit + 1,
    });
  },

  countUnread(recipientId: string) {
    return db
      .select({ count: sql<number>`count(*)::int` })
      .from(notification)
      .where(
        and(
          eq(notification.recipientId, recipientId),
          isNull(notification.readAt),
        ),
      );
  },

  markRead(recipientId: string, notificationId: string) {
    return db
      .update(notification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notification.id, notificationId),
          eq(notification.recipientId, recipientId),
          isNull(notification.readAt),
        ),
      )
      .returning({ id: notification.id });
  },

  markAllRead(recipientId: string) {
    return db
      .update(notification)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notification.recipientId, recipientId),
          isNull(notification.readAt),
        ),
      )
      .returning({ id: notification.id });
  },
};
