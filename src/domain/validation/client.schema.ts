import { clientIdSchema } from "./client-id";
import { z } from "zod";
import { normalizePhoneForStorage } from "./normalize-phone";

const phoneSchema = z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v == null ? v ?? null : normalizePhoneForStorage(v)));

export const createClientSchema = z.object({
    id: clientIdSchema,
    name: z.string().trim().min(1, "Nome é obrigatório."),
    email: z.string().trim().email().nullable().optional(),
    phone: phoneSchema,
    cep: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    addressNumber: z.string().nullable().optional(),
    complement: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    cpf: z.string().nullable().optional(),
    cnpj: z.string().nullable().optional(),
    laborRate: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
    increase: z.number().min(0).optional(),
});

export const updateClientSchema = createClientSchema.omit({ id: true }).partial();
