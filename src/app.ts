import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { env } from "./config/env.js";
import { auth } from "./lib/modules/auth/auth.js";
import { authRoutes } from "./lib/modules/auth/auth.routes.js";
import { engagementRoutes } from "./lib/modules/engagement/engagement.routes.js";
import { mediaRoutes } from "./lib/modules/media/media.routes.js";
import { postsRoutes } from "./lib/modules/posts/posts.routes.js";
import { socialRoutes } from "./lib/modules/social/social.routes.js";
import { timelineRoutes } from "./lib/modules/timeline/timeline.routes.js";

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  // Better Auth must be mounted before express.json()
  app.all("/api/auth/{*any}", toNodeHandler(auth));

  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api", authRoutes);
  app.use("/api/media", mediaRoutes);
  app.use("/api/posts", postsRoutes);
  app.use("/api/posts", engagementRoutes);
  app.use("/api/social", socialRoutes);
  app.use("/api/timeline", timelineRoutes);

  return app;
}
