import type { Request, Response } from "express";
import { userRepository } from "../../infrastructure/repositories/user.repository";
import { auditLogRepository } from "../../infrastructure/repositories/audit-log.repository";
import { getAdminMetricsUsecase } from "../../application/usecases/admin/get-admin-metrics.usecase";
import { getAuditLogUsecase } from "../../application/usecases/admin/get-audit-log.usecase";
import { listOverdueUsersUsecase } from "../../application/usecases/admin/list-overdue-users.usecase";
import { setBillingExemptUsecase } from "../../application/usecases/admin/set-billing-exempt.usecase";
import { invoiceRepository } from "../../infrastructure/repositories/invoice.repository";
import { serialize } from "../serialize";
import { planRepository } from "../../infrastructure/repositories/plan.repository";
import {
    adminSetUserPlanUsecase,
    createPlanUsecase,
    listAllPlansUsecase,
    updatePlanUsecase,
} from "../../application/usecases/plan/plan.usecases";

export const adminController = {
    async metrics(req: Request, res: Response) {
        const data = await getAdminMetricsUsecase(userRepository, auditLogRepository, req.query);
        res.json(serialize(data));
    },

    async auditLog(req: Request, res: Response) {
        const logs = await getAuditLogUsecase(auditLogRepository, req.query);
        res.json(serialize(logs));
    },

    async overdueUsers(_req: Request, res: Response) {
        const users = await listOverdueUsersUsecase(invoiceRepository);
        res.json(serialize(users));
    },

    async setBillingExempt(req: Request, res: Response) {
        await setBillingExemptUsecase(userRepository, auditLogRepository, invoiceRepository, req.params.userId as string, req.body);
        res.json({ ok: true });
    },

    async setUserPlan(req: Request, res: Response) {
        const user = await adminSetUserPlanUsecase(
            planRepository,
            userRepository,
            auditLogRepository,
            req.params.userId as string,
            req.body,
        );
        res.json(serialize(user));
    },

    async listPlans(_req: Request, res: Response) {
        res.json(serialize(await listAllPlansUsecase(planRepository)));
    },

    async createPlan(req: Request, res: Response) {
        res.status(201).json(serialize(await createPlanUsecase(planRepository, req.body)));
    },

    async updatePlan(req: Request, res: Response) {
        res.json(serialize(await updatePlanUsecase(planRepository, req.params.planId as string, req.body)));
    },
};
