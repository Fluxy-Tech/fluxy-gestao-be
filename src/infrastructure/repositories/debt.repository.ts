import { prisma } from "../database/prisma";
import type {
    CreateDebtInput,
    DebtRepository,
    ListDebtsFilters,
    UpdateDebtInput,
} from "../../domain/repository/debt.repository";

export const debtRepository: DebtRepository = {
    findAllByUser(userId, filters?: ListDebtsFilters) {
        return prisma.debt.findMany({
            where: {
                userId,
                deletedAt: null,
                ...(filters?.start || filters?.end
                    ? { date: { ...(filters?.start ? { gte: filters.start } : {}), ...(filters?.end ? { lte: filters.end } : {}) } }
                    : {}),
                ...(filters?.status ? { paymentStatus: filters.status } : {}),
            },
            orderBy: { date: "desc" },
        });
    },

    findById(id, userId) {
        return prisma.debt.findFirst({ where: { id, userId, deletedAt: null } });
    },

    create(userId, data: CreateDebtInput) {
        return prisma.debt.create({
            data: {
                ...(data.id ? { id: data.id } : {}),
                userId,
                description: data.description,
                amount: data.amount,
                category: data.category ?? null,
                date: new Date(data.date),
                paymentStatus: data.paymentStatus,
                amountPaid: data.amountPaid,
            },
        });
    },

    update(id, userId, data: UpdateDebtInput) {
        return prisma.debt.update({
            where: { id, userId },
            data: {
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.amount !== undefined ? { amount: data.amount } : {}),
                ...(data.category !== undefined ? { category: data.category } : {}),
                ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
                ...(data.paymentStatus !== undefined ? { paymentStatus: data.paymentStatus } : {}),
                ...(data.amountPaid !== undefined ? { amountPaid: data.amountPaid } : {}),
            },
        });
    },

    async softDelete(id, userId) {
        await prisma.debt.update({
            where: { id, userId },
            data: { deletedAt: new Date() },
        });
    },
};
