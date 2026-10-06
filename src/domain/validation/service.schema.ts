import { clientIdSchema } from "./client-id";
import { z } from "zod";

export const createServiceSchema = z.object({
    id: clientIdSchema,
    name: z.string().trim().min(1, "Nome é obrigatório."),
    description: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    costPrice: z.number().min(0).optional(),
    salePrice: z.number().min(0).optional(),
    active: z.boolean().optional(),
    showInCatalog: z.boolean().optional(),
});

export const updateServiceSchema = createServiceSchema.omit({ id: true }).partial();
