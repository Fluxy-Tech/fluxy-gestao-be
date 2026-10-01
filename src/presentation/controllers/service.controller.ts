import type { Request, Response } from "express";
import { serviceRepository } from "../../infrastructure/repositories/service.repository";
import { auditLogRepository } from "../../infrastructure/repositories/audit-log.repository";
import { userRepository } from "../../infrastructure/repositories/user.repository";
import { planRepository } from "../../infrastructure/repositories/plan.repository";
import { listActiveServicesUsecase, listServicesUsecase } from "../../application/usecases/service/list-services.usecase";
import { createServiceUsecase } from "../../application/usecases/service/create-service.usecase";
import { updateServiceUsecase } from "../../application/usecases/service/update-service.usecase";
import { deleteServiceUsecase } from "../../application/usecases/service/delete-service.usecase";
import { serialize } from "../serialize";

export const serviceController = {
    async list(req: Request, res: Response) {
        const onlyActive = req.query.active === "true";
        const services = onlyActive
            ? await listActiveServicesUsecase(serviceRepository, req.userId)
            : await listServicesUsecase(serviceRepository, req.userId);
        res.json(serialize(services));
    },

    async create(req: Request, res: Response) {
        const service = await createServiceUsecase(
            serviceRepository,
            auditLogRepository,
            planRepository,
            userRepository,
            req.userId,
            req.body,
        );
        res.status(201).json(serialize(service));
    },

    async update(req: Request, res: Response) {
        const service = await updateServiceUsecase(serviceRepository, auditLogRepository, req.userId, req.params.id as string, req.body);
        res.json(serialize(service));
    },

    async remove(req: Request, res: Response) {
        await deleteServiceUsecase(serviceRepository, auditLogRepository, req.userId, req.params.id as string);
        res.status(204).end();
    },
};
