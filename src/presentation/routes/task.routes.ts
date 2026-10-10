import { Router } from "express";
import { taskController } from "../controllers/task.controller";
import { asyncHandler } from "../error-handler";

export const taskRoutes = Router();

taskRoutes.get("/", asyncHandler(taskController.list));
taskRoutes.post("/", asyncHandler(taskController.create));
taskRoutes.patch("/:id", asyncHandler(taskController.update));
taskRoutes.delete("/:id", asyncHandler(taskController.remove));
