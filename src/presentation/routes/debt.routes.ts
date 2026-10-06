import { Router } from "express";
import { debtController } from "../controllers/debt.controller";
import { asyncHandler } from "../error-handler";
import { idempotentCreate } from "../idempotent-create";

export const debtRoutes = Router();

debtRoutes.get("/", asyncHandler(debtController.list));
debtRoutes.post("/", idempotentCreate("debt"), asyncHandler(debtController.create));
debtRoutes.patch("/:id", asyncHandler(debtController.update));
debtRoutes.delete("/:id", asyncHandler(debtController.remove));
