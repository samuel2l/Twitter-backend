import { Router, type Request, type Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware.js";
import { listQuerySchema, userIdParamSchema } from "./social.schemas.js";
import { SocialServiceError, socialService } from "./social.service.js";

export const socialRoutes = Router();

function handleError(error: unknown, res: Response) {
  if (error instanceof SocialServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

socialRoutes.post(
  "/follow/:userId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const params = userIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.flatten() });
        return;
      }

      const { session } = req as AuthenticatedRequest;
      const created = await socialService.follow(
        session.user.id,
        params.data.userId,
      );
      res.status(201).json(created);
    } catch (error) {
      handleError(error, res);
    }
  },
);

socialRoutes.delete(
  "/follow/:userId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const params = userIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.flatten() });
        return;
      }

      const { session } = req as AuthenticatedRequest;
      await socialService.unfollow(session.user.id, params.data.userId);
      res.status(204).send();
    } catch (error) {
      handleError(error, res);
    }
  },
);

socialRoutes.get(
  "/following/:userId/status",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const params = userIdParamSchema.safeParse(req.params);
      if (!params.success) {
        res.status(400).json({ error: params.error.flatten() });
        return;
      }

      const { session } = req as AuthenticatedRequest;
      res.json(
        await socialService.isFollowing(session.user.id, params.data.userId),
      );
    } catch (error) {
      handleError(error, res);
    }
  },
);

socialRoutes.get(
  "/followers/:userId",
  async (req: Request, res: Response) => {
    try {
      const params = userIdParamSchema.safeParse(req.params);
      const query = listQuerySchema.safeParse(req.query);
      if (!params.success || !query.success) {
        res.status(400).json({
          error: {
            params: params.success ? undefined : params.error.flatten(),
            query: query.success ? undefined : query.error.flatten(),
          },
        });
        return;
      }

      res.json(
        await socialService.getFollowers(params.data.userId, query.data.limit),
      );
    } catch (error) {
      handleError(error, res);
    }
  },
);

socialRoutes.get(
  "/following/:userId",
  async (req: Request, res: Response) => {
    try {
      const params = userIdParamSchema.safeParse(req.params);
      const query = listQuerySchema.safeParse(req.query);
      if (!params.success || !query.success) {
        res.status(400).json({
          error: {
            params: params.success ? undefined : params.error.flatten(),
            query: query.success ? undefined : query.error.flatten(),
          },
        });
        return;
      }

      res.json(
        await socialService.getFollowing(params.data.userId, query.data.limit),
      );
    } catch (error) {
      handleError(error, res);
    }
  },
);
