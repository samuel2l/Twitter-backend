import { Router, type Request, type Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import { requireAuth, type AuthenticatedRequest } from "./auth.middleware.js";

export const authRoutes = Router();

authRoutes.get("/me", requireAuth, (req: Request, res: Response) => {
  const { session } = req as AuthenticatedRequest;
  res.json(session);
});

authRoutes.get("/session", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(session);
});
