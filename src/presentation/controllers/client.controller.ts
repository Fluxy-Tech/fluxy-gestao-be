import type { Request, Response } from "express";
import { clientRepository } from "../../infrastructure/repositories/client.repository";
import { orderRepository } from "../../infrastructure/repositories/order.repository";
import { auditLogRepository } from "../../infrastructure/repositories/audit-log.repository";
import { userRepository } from "../../infrastructure/repositories/user.repository";
import { planRepository } from "../../infrastructure/repositories/plan.repository";
import { listClientsUsecase } from "../../application/usecases/client/list-clients.usecase";
import { createClientUsecase } from "../../application/usecases/client/create-client.usecase";
import { updateClientUsecase } from "../../application/usecases/client/update-client.usecase";
import { deleteClientUsecase } from "../../application/usecases/client/delete-client.usecase";
import { listOrdersByClientUsecase } from "../../application/usecases/order/list-orders.usecase";
import { serialize } from "../serialize";

export const clientController = {
    async list(req: Request, res: Response) {
        const clients = await listClientsUsecase(clientRepository, req.userId);
        res.json(serialize(clients));
    },

    async create(req: Request, res: Response) {
        const client = await createClientUsecase(
            clientRepository,
            auditLogRepository,
            planRepository,
            userRepository,
            req.userId,
            req.body,
        );
        res.status(201).json(serialize(client));
    },

    async update(req: Request, res: Response) {
        const client = await updateClientUsecase(clientRepository, auditLogRepository, req.userId, req.params.id as string, req.body);
        res.json(serialize(client));
    },

    async remove(req: Request, res: Response) {
        await deleteClientUsecase(clientRepository, auditLogRepository, req.userId, req.params.id as string);
        res.status(204).end();
    },

    async orders(req: Request, res: Response) {
        const orders = await listOrdersByClientUsecase(orderRepository, req.userId, req.params.id as string);
        res.json(serialize(orders));
    },
};
