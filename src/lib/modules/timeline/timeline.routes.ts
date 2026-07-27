import { Router, type Request, type Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware.js";
import {
  forYouQuerySchema,
  recordImpressionsSchema,
} from "../feed/feed.schemas.js";
import { feedQuerySchema } from "../posts/posts.schemas.js";
import { timelineService } from "./timeline.service.js";

export const timelineRoutes = Router();

timelineRoutes.use(requireAuth);

timelineRoutes.get("/following", async (req: Request, res: Response) => {
  try {
    const parsed = feedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { session } = req as AuthenticatedRequest;
    res.json(
      await timelineService.getFollowingFeed(
        session.user.id,
        parsed.data.limit,
        parsed.data.cursor,
      ),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

timelineRoutes.get("/for-you", async (req: Request, res: Response) => {
  try {
    const parsed = forYouQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { session } = req as AuthenticatedRequest;
    res.json(
      await timelineService.getForYouFeed(
        session.user.id,
        parsed.data.limit,
        parsed.data.cursor,
        parsed.data.sessionId,
        parsed.data.refresh,
      ),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

timelineRoutes.get("/for-you/new-count", async (req: Request, res: Response) => {
  try {
    const sessionId =
      typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;

    if (!sessionId) {
      res.status(400).json({ error: "sessionId required" });
      return;
    }

    const { session } = req as AuthenticatedRequest;
    res.json(
      await timelineService.getForYouNewCount(session.user.id, sessionId),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

timelineRoutes.post("/for-you/refresh", async (req: Request, res: Response) => {
  try {
    const { session } = req as AuthenticatedRequest;
    res.json(await timelineService.refreshForYou(session.user.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

timelineRoutes.post("/impressions", async (req: Request, res: Response) => {
  try {
    const parsed = recordImpressionsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { session } = req as AuthenticatedRequest;
    await timelineService.recordImpressions(session.user.id, parsed.data.postIds);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
