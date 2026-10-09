import { z } from "zod";

export const ANNOUNCEMENT_KINDS = ["INFO", "NEWS", "WARNING", "MAINTENANCE"] as const;

export const announcementSchema = z.object({
    title: z.string().trim().min(3, "Informe um título.").max(120, "Título muito longo (máx. 120)."),
    body: z.string().trim().min(3, "Escreva o conteúdo do anúncio.").max(5000, "Texto muito longo (máx. 5000)."),
    kind: z.enum(ANNOUNCEMENT_KINDS).default("INFO"),
    published: z.boolean().default(true),
});

export const updateAnnouncementSchema = announcementSchema.partial();

export const markAnnouncementsReadSchema = z.object({
    // Vazio/ausente = marcar todos os anúncios publicados como vistos.
    ids: z.array(z.string()).max(200).optional(),
});
