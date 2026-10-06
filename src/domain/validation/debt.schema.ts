import { clientIdSchema } from "./client-id";
import { z } from "zod";

const paymentFields = {
    paymentStatus: z.enum(["PENDING", "PARTIAL", "PAID"]).optional(),
    amountPaid: z.number().min(0).optional(),
};

export const createDebtSchema = z.object({
    id: clientIdSchema,
    description: z.string().trim().min(1, "Descrição é obrigatória."),
    amount: z.number().positive("Valor deve ser maior que zero."),
    category: z.string().nullable().optional(),
    date: z.string().min(1, "Data é obrigatória."),
    ...paymentFields,
});

export const updateDebtSchema = z.object({
    description: z.string().trim().min(1).optional(),
    amount: z.number().positive().optional(),
    category: z.string().nullable().optional(),
    date: z.string().min(1).optional(),
    ...paymentFields,
});

export const listDebtsQuerySchema = z.object({
    start: z.string().min(1).optional(),
    end: z.string().min(1).optional(),
    status: z.enum(["PENDING", "PARTIAL", "PAID"]).optional(),
});
