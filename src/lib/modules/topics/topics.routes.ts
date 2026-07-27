import { Router, type Response } from "express";
import { topicsRepository } from "./topics.repository.js";

export const topicsRoutes = Router();

topicsRoutes.get("/", async (_req, res: Response) => {
  try {
    res.json({ items: await topicsRepository.listAll() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
