import { Router } from "express";
import { serviceInvoiceController } from "../controllers/service-invoice.controller";
import { asyncHandler } from "../error-handler";
import { idempotentCreate } from "../idempotent-create";

export const serviceInvoiceRoutes = Router();

serviceInvoiceRoutes.get("/", asyncHandler(serviceInvoiceController.list));
serviceInvoiceRoutes.post("/", idempotentCreate("serviceInvoice"), asyncHandler(serviceInvoiceController.create));
serviceInvoiceRoutes.post("/:id/cancel", asyncHandler(serviceInvoiceController.cancel));
serviceInvoiceRoutes.post("/:id/reopen", asyncHandler(serviceInvoiceController.reopen));
serviceInvoiceRoutes.post("/:id/settle", asyncHandler(serviceInvoiceController.settle));
serviceInvoiceRoutes.patch("/:id/orders", asyncHandler(serviceInvoiceController.updateOrders));
