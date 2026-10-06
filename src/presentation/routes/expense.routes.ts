import { Router } from "express";
import { expenseController } from "../controllers/expense.controller";
import { asyncHandler } from "../error-handler";
import { idempotentCreate } from "../idempotent-create";

export const expenseRoutes = Router();

expenseRoutes.get("/financial-report", asyncHandler(expenseController.financialReport));
expenseRoutes.post("/refresh-cash", asyncHandler(expenseController.refreshCash));
expenseRoutes.get("/", asyncHandler(expenseController.list));
expenseRoutes.post("/", idempotentCreate("expense"), asyncHandler(expenseController.create));
expenseRoutes.patch("/:id", asyncHandler(expenseController.update));
expenseRoutes.delete("/:id", asyncHandler(expenseController.remove));
