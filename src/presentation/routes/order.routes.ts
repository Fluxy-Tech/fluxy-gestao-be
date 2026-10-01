import { Router } from "express";
import { orderController } from "../controllers/order.controller";
import { asyncHandler } from "../error-handler";

export const orderRoutes = Router();

orderRoutes.get("/dashboard", asyncHandler(orderController.dashboard));
orderRoutes.get("/calendar", asyncHandler(orderController.calendar));
orderRoutes.get("/report", asyncHandler(orderController.report));
orderRoutes.get("/open", asyncHandler(orderController.listOpen));
orderRoutes.get("/closed", asyncHandler(orderController.listClosed));
orderRoutes.get("/receivable", asyncHandler(orderController.listReceivable));
orderRoutes.get("/:id", asyncHandler(orderController.detail));
orderRoutes.post("/", asyncHandler(orderController.create));
orderRoutes.post("/:id/complete", asyncHandler(orderController.complete));
orderRoutes.post("/:id/reopen", asyncHandler(orderController.reopen));
orderRoutes.post("/:id/cancel", asyncHandler(orderController.cancel));
orderRoutes.patch("/:id/payment-status", asyncHandler(orderController.updatePayment));
orderRoutes.patch("/:id/items", asyncHandler(orderController.updateItems));
orderRoutes.patch("/:id/schedule", asyncHandler(orderController.updateSchedule));
orderRoutes.patch("/:id/notes", asyncHandler(orderController.updateNotes));
orderRoutes.post("/:id/stop-recurrence", asyncHandler(orderController.stopRecurrence));
orderRoutes.delete("/:id", asyncHandler(orderController.remove));
