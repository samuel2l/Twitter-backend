import { Router, type Request, type Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware.js";
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
    const parsed = feedQuerySchema.safeParse(req.query);
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
      ),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
