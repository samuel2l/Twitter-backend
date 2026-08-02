import { Router, type Request, type Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware.js";
import {
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from "./notifications.schemas.js";
import {
  NotificationsServiceError,
  notificationsService,
} from "./notifications.service.js";

export const notificationsRoutes = Router();

function handleError(error: unknown, res: Response) {
  if (error instanceof NotificationsServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

notificationsRoutes.get(
  "/",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const parsed = listNotificationsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }

      const { session } = req as AuthenticatedRequest;
      res.json(
        await notificationsService.list(session.user.id, parsed.data.limit),
      );
    } catch (error) {
      handleError(error, res);
    }
  },
);

notificationsRoutes.get(
  "/unread-count",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { session } = req as AuthenticatedRequest;
      res.json(await notificationsService.unreadCount(session.user.id));
    } catch (error) {
      handleError(error, res);
    }
  },
);

notificationsRoutes.post(
  "/read-all",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { session } = req as AuthenticatedRequest;
      await notificationsService.markAllRead(session.user.id);
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  },
);

notificationsRoutes.post(
  "/:id/read",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const params = notificationIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.flatten() });
        return;
      }

      const { session } = req as AuthenticatedRequest;
      await notificationsService.markRead(session.user.id, params.data.id);
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  },
);
