import type { Request, Response } from "express";
import { serviceInvoiceRepository } from "../../infrastructure/repositories/service-invoice.repository";
import { clientRepository } from "../../infrastructure/repositories/client.repository";
import { auditLogRepository } from "../../infrastructure/repositories/audit-log.repository";
import { listServiceInvoicesUsecase } from "../../application/usecases/service-invoice/list-service-invoices.usecase";
import { createServiceInvoiceUsecase } from "../../application/usecases/service-invoice/create-service-invoice.usecase";
import { cancelServiceInvoiceUsecase } from "../../application/usecases/service-invoice/cancel-service-invoice.usecase";
import { settleServiceInvoiceUsecase } from "../../application/usecases/service-invoice/settle-service-invoice.usecase";
import { serialize } from "../serialize";

export const serviceInvoiceController = {
    async list(req: Request, res: Response) {
        const invoices = await listServiceInvoicesUsecase(serviceInvoiceRepository, req.userId, req.query);
        res.json(serialize(invoices));
    },

    async create(req: Request, res: Response) {
        const invoice = await createServiceInvoiceUsecase(
            serviceInvoiceRepository,
            clientRepository,
            auditLogRepository,
            req.userId,
            req.body,
        );
        res.status(201).json(serialize(invoice));
    },

    async cancel(req: Request, res: Response) {
        const invoice = await cancelServiceInvoiceUsecase(
            serviceInvoiceRepository,
            auditLogRepository,
            req.userId,
            req.params.id as string,
            req.body,
        );
        res.json(serialize(invoice));
    },

    async settle(req: Request, res: Response) {
        const invoice = await settleServiceInvoiceUsecase(
            serviceInvoiceRepository,
            auditLogRepository,
            req.userId,
            req.params.id as string,
        );
        res.json(serialize(invoice));
    },
};
