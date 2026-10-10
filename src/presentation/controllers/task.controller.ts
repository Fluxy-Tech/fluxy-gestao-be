import type { Request, Response } from "express";
import {
    createTaskUsecase,
    deleteTaskUsecase,
    listTasksUsecase,
    updateTaskUsecase,
} from "../../application/usecases/task/task.usecases";
import { serialize } from "../serialize";

export const taskController = {
    async list(req: Request, res: Response) {
        res.json(serialize(await listTasksUsecase(req.userId, req.query)));
    },

    async create(req: Request, res: Response) {
        res.status(201).json(serialize(await createTaskUsecase(req.userId, req.body)));
    },

    async update(req: Request, res: Response) {
        res.json(serialize(await updateTaskUsecase(req.userId, req.params.id as string, req.body)));
    },

    async remove(req: Request, res: Response) {
        await deleteTaskUsecase(req.userId, req.params.id as string);
        res.status(204).end();
    },
};
