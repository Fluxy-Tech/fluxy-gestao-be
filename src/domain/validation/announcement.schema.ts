import { z } from "zod";

export const ANNOUNCEMENT_KINDS = ["INFO", "NEWS", "WARNING", "MAINTENANCE"] as const;

export const MAX_ANNOUNCEMENT_IMAGES = 6;

// Só aceita imagens enviadas pelo nosso upload (POST /api/admin/announcements/images),
// para não exibir para todos os usuários um link qualquer de fora.
const imageUrl = z.string().refine((u) => {
    const base = process.env.UPLOAD_PUBLIC_BASE_URL;
    return !!base && u.startsWith(`${base}/`) && u.includes("/announcements/");
}, "Imagem inválida.");

export const announcementSchema = z.object({
    title: z.string().trim().min(3, "Informe um título.").max(120, "Título muito longo (máx. 120)."),
    body: z.string().trim().min(3, "Escreva o conteúdo do anúncio.").max(5000, "Texto muito longo (máx. 5000)."),
    kind: z.enum(ANNOUNCEMENT_KINDS).default("INFO"),
    published: z.boolean().default(true),
    images: z.array(imageUrl).max(MAX_ANNOUNCEMENT_IMAGES, `Até ${MAX_ANNOUNCEMENT_IMAGES} imagens por anúncio.`).default([]),
});

// Sem defaults: campo ausente no PATCH fica como está (no Zod 4, .partial() de um campo com
// .default() aplicaria o default e, p.ex., apagaria as imagens).
export const updateAnnouncementSchema = z.object({
    title: announcementSchema.shape.title.optional(),
    body: announcementSchema.shape.body.optional(),
    kind: z.enum(ANNOUNCEMENT_KINDS).optional(),
    published: z.boolean().optional(),
    images: z.array(imageUrl).max(MAX_ANNOUNCEMENT_IMAGES, `Até ${MAX_ANNOUNCEMENT_IMAGES} imagens por anúncio.`).optional(),
});

export const markAnnouncementsReadSchema = z.object({
    // Vazio/ausente = marcar todos os anúncios publicados como vistos.
    ids: z.array(z.string()).max(200).optional(),
});
