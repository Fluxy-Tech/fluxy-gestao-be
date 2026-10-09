import { z } from "zod";

export const TICKET_SEVERITIES = ["S1", "S2", "S3"] as const;
export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"] as const;

export const TICKET_STATUS_LABEL: Record<(typeof TICKET_STATUSES)[number], string> = {
    OPEN: "Aberto",
    IN_PROGRESS: "Em atendimento",
    WAITING_USER: "Aguardando você",
    RESOLVED: "Resolvido",
    CLOSED: "Fechado",
};

// Os campos chegam como multipart (por causa dos anexos), então tudo vem como texto.
export const createTicketSchema = z.object({
    subject: z.string().trim().min(5, "Descreva o problema em poucas palavras (mín. 5 caracteres).").max(120, "Assunto muito longo (máx. 120)."),
    screen: z.string().trim().min(1, "Informe em qual tela está o problema.").max(80),
    severity: z.enum(TICKET_SEVERITIES, { message: "Escolha o nível: S1, S2 ou S3." }),
    description: z.string().trim().min(20, "Descreva o erro com mais detalhes (mín. 20 caracteres).").max(10000, "Descrição muito longa."),
});

export const ticketMessageSchema = z.object({
    body: z.string().trim().max(10000, "Mensagem muito longa.").default(""),
});

export const ticketListFilterSchema = z.object({
    status: z.enum([...TICKET_STATUSES, "ACTIVE"]).optional(),
    severity: z.enum(TICKET_SEVERITIES).optional(),
    search: z.string().trim().max(120).optional(),
});

export const adminUpdateTicketSchema = z
    .object({
        status: z.enum(TICKET_STATUSES).optional(),
        severity: z.enum(TICKET_SEVERITIES).optional(),
    })
    .refine((v) => v.status || v.severity, "Nada para alterar.");

export const userCloseTicketSchema = z.object({
    status: z.enum(["CLOSED", "OPEN"]),
});
