import { Router, type Request, type Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware.js";
import { postIdParamSchema } from "./engagement.schemas.js";
import {
  EngagementServiceError,
  engagementService,
} from "./engagement.service.js";
import type { InteractionType } from "./engagement.repository.js";

export const engagementRoutes = Router({ mergeParams: true });

function handleError(error: unknown, res: Response) {
  if (error instanceof EngagementServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

function createAddHandler(type: InteractionType) {
  return async (req: Request, res: Response) => {
    try {
      const params = postIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.flatten() });
        return;
      }

      const { session } = req as AuthenticatedRequest;
      const created = await engagementService.add(
        session.user.id,
        params.data.postId,
        type,
      );
      res.status(201).json(created);
    } catch (error) {
      handleError(error, res);
    }
  };
}

function createRemoveHandler(type: InteractionType) {
  return async (req: Request, res: Response) => {
    try {
      const params = postIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.flatten() });
        return;
      }

      const { session } = req as AuthenticatedRequest;
      await engagementService.remove(
        session.user.id,
        params.data.postId,
        type,
      );
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  };
}

engagementRoutes.post("/:postId/like", requireAuth, createAddHandler("like"));
engagementRoutes.delete("/:postId/like", requireAuth, createRemoveHandler("like"));

engagementRoutes.post(
  "/:postId/bookmark",
  requireAuth,
  createAddHandler("bookmark"),
);
engagementRoutes.delete(
  "/:postId/bookmark",
  requireAuth,
  createRemoveHandler("bookmark"),
);

engagementRoutes.post("/:postId/share", requireAuth, createAddHandler("share"));
engagementRoutes.delete(
  "/:postId/share",
  requireAuth,
  createRemoveHandler("share"),
);

engagementRoutes.post("/:postId/view", requireAuth, createAddHandler("view"));

engagementRoutes.get(
  "/:postId/interactions/me",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const params = postIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.flatten() });
        return;
      }

      const { session } = req as AuthenticatedRequest;
      res.json(await engagementService.mine(session.user.id, params.data.postId));
    } catch (error) {
      handleError(error, res);
    }
  },
);

engagementRoutes.get(
  "/:postId/interactions",
  async (req: Request, res: Response) => {
    try {
      const params = postIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.flatten() });
        return;
      }

      res.json(await engagementService.counts(params.data.postId));
    } catch (error) {
      handleError(error, res);
    }
  },
);
