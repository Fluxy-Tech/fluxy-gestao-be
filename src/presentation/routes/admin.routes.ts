import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { asyncHandler } from "../error-handler";

export const adminRoutes = Router();

adminRoutes.get("/metrics", asyncHandler(adminController.metrics));
adminRoutes.get("/audit-log", asyncHandler(adminController.auditLog));
adminRoutes.get("/overdue-users", asyncHandler(adminController.overdueUsers));
adminRoutes.patch("/users/:userId/billing-exempt", asyncHandler(adminController.setBillingExempt));
adminRoutes.delete("/users/:userId", asyncHandler(adminController.deleteUser));
adminRoutes.patch("/users/:userId/plan", asyncHandler(adminController.setUserPlan));
adminRoutes.get("/plans", asyncHandler(adminController.listPlans));
adminRoutes.post("/plans", asyncHandler(adminController.createPlan));
adminRoutes.patch("/plans/:planId", asyncHandler(adminController.updatePlan));
