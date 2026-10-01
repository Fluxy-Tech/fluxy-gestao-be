import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { asyncHandler } from "../error-handler";
import { uploadLogo } from "../../infrastructure/storage/upload.middleware";

export const userRoutes = Router();

userRoutes.get("/me", asyncHandler(userController.me));
// Sem requireActiveBilling (ver index.ts): quem está com a cobrança bloqueada também
// precisa conseguir levar os próprios dados para o app.
userRoutes.get("/me/export", asyncHandler(userController.exportData));
userRoutes.patch("/me/profile", asyncHandler(userController.updateProfile));
userRoutes.patch("/me/company", asyncHandler(userController.updateCompany));
userRoutes.patch("/me/brand", asyncHandler(userController.updateBrand));
userRoutes.patch("/me/preferences", asyncHandler(userController.updatePreferences));
userRoutes.get("/me/plan", asyncHandler(userController.myPlan));
userRoutes.patch("/me/plan", asyncHandler(userController.changeMyPlan));
userRoutes.post("/me/logo", uploadLogo, asyncHandler(userController.uploadLogo));
