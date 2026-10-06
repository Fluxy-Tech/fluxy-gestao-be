import { clientIdSchema } from "./client-id";
import { z } from "zod";

export const createExpenseSchema = z
    .object({
        id: clientIdSchema,
        description: z.string().trim().min(1, "Descrição é obrigatória."),
        amount: z.number().positive("Valor deve ser maior que zero."),
        category: z.string().nullable().optional(),
        date: z.string().min(1, "Data é obrigatória."),
        status: z.enum(["PENDING", "PAID"]).optional(),
        isRecurring: z.boolean().optional(),
        recurrenceFrequency: z.enum(["MONTHLY"]).nullable().optional(),
        recurrenceEndDate: z.string().nullable().optional(),
    })
    .refine((d) => !d.isRecurring || d.recurrenceFrequency, {
        message: "Selecione a frequência da recorrência.",
        path: ["recurrenceFrequency"],
    });

export const updateExpenseSchema = z.object({
    description: z.string().trim().min(1).optional(),
    amount: z.number().positive().optional(),
    category: z.string().nullable().optional(),
    date: z.string().min(1).optional(),
    status: z.enum(["PENDING", "PAID"]).optional(),
    isRecurring: z.boolean().optional(),
    recurrenceFrequency: z.enum(["MONTHLY"]).nullable().optional(),
    recurrenceEndDate: z.string().nullable().optional(),
});

export const listExpensesQuerySchema = z.object({
    start: z.string().min(1).optional(),
    end: z.string().min(1).optional(),
    status: z.enum(["PENDING", "PAID"]).optional(),
});
