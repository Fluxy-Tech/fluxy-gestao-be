import { clientIdSchema } from "./client-id";
import { z } from "zod";

// serviceId ausente = serviço extra (fora do catálogo); nesse caso o nome é obrigatório.
// discount/increase são valores em R$ sobre o total do item.
export const createOrderItemSchema = z
    .object({
        serviceId: z.string().min(1).nullable().optional(),
        serviceName: z.string().trim().max(200).nullable().optional(),
        costPrice: z.number().min(0),
        salePrice: z.number().min(0),
        discount: z.number().min(0).optional(),
        increase: z.number().min(0).optional(),
        quantity: z.number().min(1).optional(),
        finalPrice: z.number().min(0),
    })
    .refine((item) => !!item.serviceId || !!item.serviceName, {
        message: "Informe o nome do serviço extra.",
        path: ["serviceName"],
    });

export const createOrderSchema = z
    .object({
        id: clientIdSchema,
        clientId: z.string().min(1, "Selecione um cliente."),
        patientName: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        paymentMethod: z.string().nullable().optional(),
        deliveryDate: z.string().nullable().optional(),
        paymentDueDate: z.string().nullable().optional(),
        totalCost: z.number().min(0),
        totalSale: z.number().min(0),
        items: z.array(createOrderItemSchema).min(1, "Adicione ao menos um serviço."),
        recurWeekly: z.boolean().optional(),
        recurMonthly: z.boolean().optional(),
    })
    .refine((data) => !(data.recurWeekly || data.recurMonthly) || !!data.deliveryDate, {
        message: "Informe a data e hora do agendamento para tornar a OS fixa.",
        path: ["deliveryDate"],
    });

export const updateOrderItemsSchema = z.object({
    items: z.array(createOrderItemSchema).min(1, "Adicione ao menos um serviço."),
    totalCost: z.number().min(0),
    totalSale: z.number().min(0),
});

export const cancelOrderSchema = z.object({
    cancelReason: z.string().nullable().optional(),
});

export const updatePaymentStatusSchema = z.object({
    paymentStatus: z.enum(["PENDING", "PAID", "PARTIAL", "OVERDUE"]),
    amountPaid: z.number().min(0).optional(),
});

export const updateNotesSchema = z.object({
    notes: z.string().nullable(),
});

export const updateScheduleSchema = z.object({
    deliveryDate: z.string().min(1, "Informe a data e hora do agendamento."),
});
