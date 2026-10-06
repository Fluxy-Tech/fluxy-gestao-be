import { z } from "zod";

export const dateRangeSchema = z.object({
    start: z.string().min(1, "Data inicial é obrigatória."),
    end: z.string().min(1, "Data final é obrigatória."),
});

export const auditLogFilterSchema = z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    type: z.enum(["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "STATUS_CHANGE", "PAYMENT"]).optional(),
    userId: z.string().optional(),
});

// O admin redigita o e-mail do usuário para confirmar a exclusão definitiva.
export const deleteUserSchema = z.object({
    confirmEmail: z.string().min(1, "Confirme o e-mail do usuário."),
});

export const setBillingExemptSchema = z.object({
    exempt: z.boolean(),
});
