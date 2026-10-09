import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { asyncHandler } from "../error-handler";
import { communityController } from "../controllers/community.controller";
import { supportController } from "../controllers/support.controller";

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

// Comunidade: anúncios para todos os usuários.
adminRoutes.get("/announcements", asyncHandler(communityController.adminList));
adminRoutes.post("/announcements", asyncHandler(communityController.adminCreate));
adminRoutes.patch("/announcements/:id", asyncHandler(communityController.adminUpdate));
adminRoutes.delete("/announcements/:id", asyncHandler(communityController.adminDelete));

// Suporte: fila de tickets (a conversa usa as rotas de /api/support, que liberam o admin).
adminRoutes.get("/tickets", asyncHandler(supportController.adminList));
adminRoutes.patch("/tickets/:id", asyncHandler(supportController.adminUpdate));
