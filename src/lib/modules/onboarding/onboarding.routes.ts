import { Router, type Request, type Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../auth/auth.middleware.js";
import { setInterestsSchema } from "./onboarding.schemas.js";
import {
  OnboardingServiceError,
  onboardingService,
} from "./onboarding.service.js";

export const onboardingRoutes = Router();

onboardingRoutes.use(requireAuth);

function handleError(error: unknown, res: Response) {
  if (error instanceof OnboardingServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

onboardingRoutes.get("/status", async (req: Request, res: Response) => {
  try {
    const { session } = req as AuthenticatedRequest;
    res.json(await onboardingService.getStatus(session.user.id));
  } catch (error) {
    handleError(error, res);
  }
});

onboardingRoutes.post("/interests", async (req: Request, res: Response) => {
  try {
    const parsed = setInterestsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { session } = req as AuthenticatedRequest;
    res.status(201).json(
      await onboardingService.setInterests(session.user.id, parsed.data),
    );
  } catch (error) {
    handleError(error, res);
  }
});
