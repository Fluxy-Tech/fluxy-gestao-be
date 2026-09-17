import { prisma } from "../database/prisma";
import type {
    CreateInvoiceInput,
    InvoiceRepository,
    UpdateInvoicePaymentInput,
} from "../../domain/repository/invoice.repository";

export const invoiceRepository: InvoiceRepository = {
    findAllByUser(userId) {
        return prisma.invoice.findMany({ where: { userId }, orderBy: { referenceMonth: "desc" } });
    },

    findById(id) {
        return prisma.invoice.findUnique({ where: { id } });
    },

    findByUserAndMonth(userId, referenceMonth) {
        return prisma.invoice.findUnique({ where: { userId_referenceMonth: { userId, referenceMonth } } });
    },

    findByAsaasPaymentId(asaasPaymentId) {
        return prisma.invoice.findFirst({ where: { asaasPaymentId } });
    },

    findPendingWithPaymentId(userId?: string) {
        return prisma.invoice.findMany({
            where: { status: "PENDING", asaasPaymentId: { not: null }, ...(userId ? { userId } : {}) },
        });
    },

    findUnpaidDueBefore(userId, before) {
        return prisma.invoice.findMany({
            where: { userId, status: "PENDING", dueDate: { lt: before } },
        });
    },

    findAllUnpaidDueBefore(before) {
        return prisma.invoice.findMany({
            where: { status: "PENDING", dueDate: { lt: before } },
        });
    },

    findOverdueWithUser(before) {
        return prisma.invoice.findMany({
            where: { status: "PENDING", dueDate: { lt: before } },
            include: { user: { select: { name: true, email: true, companyName: true, plan: true, billingBlocked: true } } },
            orderBy: { dueDate: "asc" },
        });
    },

    create(userId, data: CreateInvoiceInput) {
        return prisma.invoice.create({
            data: {
                userId,
                referenceMonth: data.referenceMonth,
                amount: data.amount,
                dueDate: data.dueDate,
                asaasPaymentId: data.asaasPaymentId,
                asaasInvoiceUrl: data.asaasInvoiceUrl,
            },
        });
    },

    markPaid(id) {
        return prisma.invoice.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } });
    },

    cancel(id) {
        return prisma.invoice.update({ where: { id }, data: { status: "CANCELED" } });
    },

    updatePaymentLink(id, data: UpdateInvoicePaymentInput) {
        return prisma.invoice.update({
            where: { id },
            data: {
                asaasPaymentId: data.asaasPaymentId,
                asaasInvoiceUrl: data.asaasInvoiceUrl,
                dueDate: data.dueDate,
                status: data.status,
            },
        });
    },
};
