import type { Request, Response } from "express";
import { orderRepository } from "../../infrastructure/repositories/order.repository";
import { clientRepository } from "../../infrastructure/repositories/client.repository";
import { userRepository } from "../../infrastructure/repositories/user.repository";
import { auditLogRepository } from "../../infrastructure/repositories/audit-log.repository";
import { listOpenOrdersUsecase, listClosedOrdersUsecase, listReceivableOrdersUsecase, getOrderDetailUsecase } from "../../application/usecases/order/list-orders.usecase";
import { createOrderUsecase } from "../../application/usecases/order/create-order.usecase";
import {
    cancelOrderUsecase,
    completeOrderUsecase,
    reopenOrderUsecase,
    updateOrderItemsUsecase,
    updatePaymentStatusUsecase,
} from "../../application/usecases/order/update-order-status.usecase";
import { updateOrderScheduleUsecase } from "../../application/usecases/order/update-order-schedule.usecase";
import { updateOrderNotesUsecase } from "../../application/usecases/order/update-order-notes.usecase";
import { stopOrderRecurrenceUsecase } from "../../application/usecases/order/stop-order-recurrence.usecase";
import { deleteOrderUsecase } from "../../application/usecases/order/delete-order.usecase";
import { getDashboardUsecase } from "../../application/usecases/order/get-dashboard.usecase";
import { getReportUsecase } from "../../application/usecases/order/get-report.usecase";
import { getCalendarOrdersUsecase } from "../../application/usecases/order/get-calendar-orders.usecase";
import { serialize } from "../serialize";
import type { OrderStatus } from "../../../generated/prisma/client";

export const orderController = {
    async listOpen(req: Request, res: Response) {
        const orders = await listOpenOrdersUsecase(orderRepository, req.userId);
        res.json(serialize(orders));
    },

    async listClosed(req: Request, res: Response) {
        const orders = await listClosedOrdersUsecase(orderRepository, req.userId);
        res.json(serialize(orders));
    },

    async listReceivable(req: Request, res: Response) {
        const orders = await listReceivableOrdersUsecase(orderRepository, req.userId);
        res.json(serialize(orders));
    },

    async detail(req: Request, res: Response) {
        const order = await getOrderDetailUsecase(orderRepository, req.userId, req.params.id as string);
        res.json(serialize(order));
    },

    async create(req: Request, res: Response) {
        const order = await createOrderUsecase(orderRepository, clientRepository, userRepository, auditLogRepository, req.userId, req.body);
        res.status(201).json(serialize(order));
    },

    async complete(req: Request, res: Response) {
        const order = await completeOrderUsecase(orderRepository, auditLogRepository, req.userId, req.params.id as string);
        res.json(serialize(order));
    },

    async cancel(req: Request, res: Response) {
        const order = await cancelOrderUsecase(orderRepository, auditLogRepository, req.userId, req.params.id as string, req.body);
        res.json(serialize(order));
    },

    async reopen(req: Request, res: Response) {
        const order = await reopenOrderUsecase(orderRepository, auditLogRepository, req.userId, req.params.id as string);
        res.json(serialize(order));
    },

    async updatePayment(req: Request, res: Response) {
        const order = await updatePaymentStatusUsecase(orderRepository, auditLogRepository, req.userId, req.params.id as string, req.body);
        res.json(serialize(order));
    },

    async updateItems(req: Request, res: Response) {
        const order = await updateOrderItemsUsecase(orderRepository, auditLogRepository, req.userId, req.params.id as string, req.body);
        res.json(serialize(order));
    },

    async updateSchedule(req: Request, res: Response) {
        const order = await updateOrderScheduleUsecase(
            orderRepository,
            userRepository,
            auditLogRepository,
            req.userId,
            req.params.id as string,
            req.body,
        );
        res.json(serialize(order));
    },

    async updateNotes(req: Request, res: Response) {
        const order = await updateOrderNotesUsecase(
            orderRepository,
            auditLogRepository,
            req.userId,
            req.params.id as string,
            req.body,
        );
        res.json(serialize(order));
    },

    async stopRecurrence(req: Request, res: Response) {
        const order = await stopOrderRecurrenceUsecase(orderRepository, auditLogRepository, req.userId, req.params.id as string);
        res.json(serialize(order));
    },

    async remove(req: Request, res: Response) {
        await deleteOrderUsecase(orderRepository, auditLogRepository, req.userId, req.params.id as string);
        res.status(204).end();
    },

    async dashboard(req: Request, res: Response) {
        const data = await getDashboardUsecase(orderRepository, clientRepository, req.userId);
        res.json(serialize(data));
    },

    async calendar(req: Request, res: Response) {
        const { start, end } = req.query as { start: string; end: string };
        const data = await getCalendarOrdersUsecase(orderRepository, clientRepository, req.userId, start, end);
        res.json(serialize(data));
    },

    async report(req: Request, res: Response) {
        const { start, end, status } = req.query as { start: string; end: string; status?: string };
        const data = await getReportUsecase(
            orderRepository,
            req.userId,
            start,
            end,
            status && status !== "ALL" ? (status as OrderStatus) : undefined,
        );
        res.json(serialize(data));
    },
};
