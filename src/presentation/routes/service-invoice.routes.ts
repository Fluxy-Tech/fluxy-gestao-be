import { Router } from "express";
import { serviceInvoiceController } from "../controllers/service-invoice.controller";
import { asyncHandler } from "../error-handler";

export const serviceInvoiceRoutes = Router();

serviceInvoiceRoutes.get("/", asyncHandler(serviceInvoiceController.list));
serviceInvoiceRoutes.post("/", asyncHandler(serviceInvoiceController.create));
serviceInvoiceRoutes.post("/:id/cancel", asyncHandler(serviceInvoiceController.cancel));
serviceInvoiceRoutes.post("/:id/reopen", asyncHandler(serviceInvoiceController.reopen));
serviceInvoiceRoutes.post("/:id/settle", asyncHandler(serviceInvoiceController.settle));
serviceInvoiceRoutes.patch("/:id/orders", asyncHandler(serviceInvoiceController.updateOrders));
