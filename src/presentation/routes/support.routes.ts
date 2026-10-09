import { Router } from "express";
import { supportController } from "../controllers/support.controller";
import { asyncHandler } from "../error-handler";
import { withTicketFiles } from "../../infrastructure/storage/upload.middleware";

export const supportRoutes = Router();

supportRoutes.get("/summary", asyncHandler(supportController.summary));
supportRoutes.get("/tickets", asyncHandler(supportController.listMine));
supportRoutes.post("/tickets", withTicketFiles, asyncHandler(supportController.create));
supportRoutes.get("/tickets/:id", asyncHandler(supportController.get));
supportRoutes.post("/tickets/:id/messages", withTicketFiles, asyncHandler(supportController.addMessage));
supportRoutes.patch("/tickets/:id/status", asyncHandler(supportController.setStatus));
supportRoutes.get("/attachments/:attachmentId", asyncHandler(supportController.attachment));
