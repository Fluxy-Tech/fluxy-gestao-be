import { Router } from "express";
import { publicController } from "../controllers/public.controller";
import { asyncHandler } from "../error-handler";

export const publicRoutes = Router();

publicRoutes.get("/catalog", asyncHandler(publicController.catalog));
publicRoutes.get("/plans", asyncHandler(publicController.plans));
publicRoutes.get("/business-segments", asyncHandler(publicController.businessSegments));
