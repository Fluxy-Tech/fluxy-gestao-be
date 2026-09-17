import { z } from "zod";

export const createServiceInvoiceSchema = z.object({
    clientId: z.string().min(1, "Selecione um cliente."),
    orderIds: z.array(z.string().min(1)).min(1, "Selecione ao menos uma OS."),
});

export const cancelServiceInvoiceSchema = z.object({
    cancelReason: z.string().nullable().optional(),
});

export const listServiceInvoicesQuerySchema = z.object({
    clientId: z.string().min(1).optional(),
    number: z.coerce.number().int().positive().optional(),
    start: z.string().min(1).optional(),
    end: z.string().min(1).optional(),
});
