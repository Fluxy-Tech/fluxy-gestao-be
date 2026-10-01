import { z } from "zod";
import { normalizePhoneForStorage } from "./normalize-phone";

const phoneSchema = z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v == null ? v ?? null : normalizePhoneForStorage(v)));

export const updateProfileSchema = z.object({
    name: z.string().trim().min(1).optional(),
    phone: phoneSchema,
    theme: z.enum(["light", "dark"]).optional(),
});

export const updateCompanySchema = z.object({
    businessCategory: z.enum(["STANDARD", "HAIRDRESSER", "LAB", "PETSHOP"]).optional(),
    // Ramo de atuação (domain/business-segments.ts); quando enviado, define o businessCategory.
    businessSegment: z.string().trim().min(1).optional(),
    companyName: z.string().nullable().optional(),
    cnpj: z.string().nullable().optional(),
    cpf: z.string().nullable().optional(),
    phone: phoneSchema,
    cep: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    addressNumber: z.string().nullable().optional(),
    complement: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    currentCash: z.number().min(0).optional(),
});

export const updatePreferencesSchema = z.object({
    dashboardView: z.enum(["table", "calendar"]),
});

export const updateBrandSchema = z.object({
    primaryColor: z.string().optional(),
    pdfColor: z.string().optional(),
    includeLogoInPdf: z.boolean().optional(),
    logoUrl: z.string().url().optional(),
});
