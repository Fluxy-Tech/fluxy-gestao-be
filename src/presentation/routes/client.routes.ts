import { Router } from "express";
import { clientController } from "../controllers/client.controller";
import { asyncHandler } from "../error-handler";
import { idempotentCreate } from "../idempotent-create";

export const clientRoutes = Router();

clientRoutes.get("/", asyncHandler(clientController.list));
clientRoutes.post("/", idempotentCreate("client"), asyncHandler(clientController.create));
clientRoutes.patch("/:id", asyncHandler(clientController.update));
clientRoutes.delete("/:id", asyncHandler(clientController.remove));
clientRoutes.get("/:id/orders", asyncHandler(clientController.orders));
