import { Router } from "express";
import { communityController } from "../controllers/community.controller";
import { asyncHandler } from "../error-handler";

export const communityRoutes = Router();

communityRoutes.get("/announcements", asyncHandler(communityController.announcements));
communityRoutes.post("/announcements/read", asyncHandler(communityController.markRead));
