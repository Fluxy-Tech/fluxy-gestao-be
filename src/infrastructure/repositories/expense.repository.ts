import { prisma } from "../database/prisma";
import type {
    CreateExpenseInput,
    ExpenseRepository,
    ListExpensesFilters,
    UpdateExpenseInput,
} from "../../domain/repository/expense.repository";

export const expenseRepository: ExpenseRepository = {
    findAllByUser(userId, filters?: ListExpensesFilters) {
        return prisma.expense.findMany({
            where: {
                userId,
                deletedAt: null,
                ...(filters?.start || filters?.end
                    ? { date: { ...(filters?.start ? { gte: filters.start } : {}), ...(filters?.end ? { lte: filters.end } : {}) } }
                    : {}),
                ...(filters?.status ? { status: filters.status } : {}),
            },
            orderBy: { date: "desc" },
        });
    },

    findById(id, userId) {
        return prisma.expense.findFirst({ where: { id, userId, deletedAt: null } });
    },

    create(userId, data: CreateExpenseInput) {
        return prisma.expense.create({
            data: {
                ...(data.id ? { id: data.id } : {}),
                userId,
                description: data.description,
                amount: data.amount,
                category: data.category ?? null,
                date: new Date(data.date),
                status: data.status ?? "PENDING",
                isRecurring: data.isRecurring ?? false,
                recurrenceFrequency: data.isRecurring ? data.recurrenceFrequency ?? null : null,
                recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null,
            },
        });
    },

    update(id, userId, data: UpdateExpenseInput) {
        return prisma.expense.update({
            where: { id, userId },
            data: {
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.amount !== undefined ? { amount: data.amount } : {}),
                ...(data.category !== undefined ? { category: data.category } : {}),
                ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
                ...(data.status !== undefined ? { status: data.status } : {}),
                ...(data.isRecurring !== undefined ? { isRecurring: data.isRecurring } : {}),
                ...(data.recurrenceFrequency !== undefined ? { recurrenceFrequency: data.recurrenceFrequency } : {}),
                ...(data.recurrenceEndDate !== undefined
                    ? { recurrenceEndDate: data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null }
                    : {}),
            },
        });
    },

    async softDelete(id, userId) {
        await prisma.expense.update({
            where: { id, userId },
            data: { deletedAt: new Date() },
        });
    },

    findRelevantForRange(userId, start, end) {
        return prisma.expense.findMany({
            where: {
                userId,
                deletedAt: null,
                OR: [
                    { isRecurring: false, date: { gte: start, lte: end } },
                    {
                        isRecurring: true,
                        date: { lte: end },
                        OR: [{ recurrenceEndDate: null }, { recurrenceEndDate: { gte: start } }],
                    },
                ],
            },
            orderBy: { date: "asc" },
        });
    },
};
