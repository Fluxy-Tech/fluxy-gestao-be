import { z } from "zod";

// Limite vazio/null = sem limite.
const limitSchema = z.number().int().min(0).nullable();

export const planInputSchema = z.object({
    name: z.string().trim().min(1, "Informe o nome do plano."),
    price: z.number().min(0, "O valor não pode ser negativo."),
    maxClients: limitSchema,
    maxServices: limitSchema,
    maxOrdersPerMonth: limitSchema,
    description: z.string().trim().nullable(),
    active: z.boolean(),
    sortOrder: z.number().int().min(0),
});

export const createPlanSchema = planInputSchema.extend({
    slug: z
        .string()
        .trim()
        .min(1, "Informe o identificador do plano.")
        .regex(/^[a-z0-9-]+$/, "Use só letras minúsculas, números e hífen no identificador."),
});

// O slug não é editável: é a chave referenciada por User.plan.
export const updatePlanSchema = planInputSchema.partial();

export const changePlanSchema = z.object({
    plan: z.string().trim().min(1, "Escolha um plano."),
});
