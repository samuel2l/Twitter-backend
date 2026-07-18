import { Router, type Request, type Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware.js";
import { createPostSchema, feedQuerySchema } from "./posts.schemas.js";
import { PostsServiceError, postsService } from "./posts.service.js";

export const postsRoutes = Router();

function handleError(error: unknown, res: Response) {
  if (error instanceof PostsServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

postsRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createPostSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { session } = req as AuthenticatedRequest;
    const created = await postsService.create(session.user.id, parsed.data);
    res.status(201).json(created);
  } catch (error) {
    handleError(error, res);
  }
});

postsRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const parsed = feedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    res.json(
      await postsService.getFeed(parsed.data.limit, parsed.data.cursor),
    );
  } catch (error) {
    handleError(error, res);
  }
});

postsRoutes.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "id required" });
      return;
    }
    res.json(await postsService.getById(id as string));
  } catch (error) {
    handleError(error, res);
  }
});

postsRoutes.get("/:id/replies", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "id required" });
      return;
    }

    const parsed = feedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    res.json(await postsService.getReplies(id as string, parsed.data.limit));
  } catch (error) {
    handleError(error, res);
  }
});

postsRoutes.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: "id required" });
      return;
    }

    const { session } = req as AuthenticatedRequest;
    await postsService.delete(id as string, session.user.id);
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});