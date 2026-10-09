import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../../../infrastructure/database/prisma";
import { deleteFromS3, getS3Object, uploadPrivateToS3 } from "../../../infrastructure/storage/s3-storage";
import { sendMail } from "../../../infrastructure/email/mailer";
import { newTicketAdminEmailTemplate, ticketUpdateEmailTemplate } from "../../../infrastructure/email/templates";
import {
    adminUpdateTicketSchema,
    createTicketSchema,
    TICKET_STATUS_LABEL,
    ticketListFilterSchema,
    ticketMessageSchema,
    userCloseTicketSchema,
} from "../../../domain/validation/support.schema";
import type { Prisma, TicketAuthorRole, TicketStatus } from "../../../../generated/prisma/client";

// Suporte: o usuário abre tickets (tela com problema, nível S1/S2/S3, descrição e anexos)
// e conversa com o suporte; o admin atende pela fila. Todo o histórico fica em
// TicketMessage — inclusive as mudanças de status/nível, registradas como SYSTEM.

export type Requester = { userId: string; role: string };
export type UploadedFile = { originalname: string; mimetype: string; size: number; buffer: Buffer };

const APP_URL = process.env.APP_URL ?? "https://gestao.fluxytechnologies.com.br";
const ACTIVE: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_USER"];
const isAdmin = (r: Requester) => r.role === "admin";

const attachmentSelect = { id: true, fileName: true, mimeType: true, size: true, createdAt: true, messageId: true } as const;

function safeFileName(name: string) {
    const ext = path.extname(name).slice(0, 10).replace(/[^.\w]/g, "");
    const base =
        path
            .basename(name, path.extname(name))
            .normalize("NFD")
            .replace(/[^\w-]+/g, "_")
            .slice(0, 60) || "arquivo";
    return `${base}${ext}`;
}

async function storeAttachments(ticketId: string, messageId: string, files: UploadedFile[]) {
    if (files.length === 0) return;
    const prefix = process.env.SEAWEEDFS_S3_PREFIX ?? "imagensperfil";
    const stored: { key: string; fileName: string; file: UploadedFile }[] = [];
    try {
        for (const file of files) {
            // O multer entrega o nome em latin1; converte para não estragar acentos.
            const fileName = Buffer.from(file.originalname, "latin1").toString("utf8").slice(0, 200);
            const key = `${prefix}/tickets/${ticketId}/${randomUUID()}-${safeFileName(fileName)}`;
            await uploadPrivateToS3(key, file.buffer, file.mimetype);
            stored.push({ key, fileName, file });
        }
    } catch (err) {
        console.error("[support] falha ao enviar anexo:", (err as Error).message);
        await deleteFromS3(stored.map((s) => s.key));
        throw new Error("Não foi possível enviar os anexos. Tente novamente.");
    }
    await prisma.ticketAttachment.createMany({
        data: stored.map(({ key, fileName, file }) => ({
            ticketId,
            messageId,
            fileName,
            mimeType: file.mimetype,
            size: file.size,
            storageKey: key,
        })),
    });
}

type ReadState = { lastMessageAt: Date; lastMessageBy: TicketAuthorRole; userReadAt: Date | null; adminReadAt: Date | null };

// "Resposta nova" para cada lado: a última mensagem é do outro lado (ou do sistema) e
// chegou depois da última vez que esse lado abriu o ticket.
function unreadFor(side: "user" | "admin", t: ReadState) {
    if (side === "user") {
        if (t.lastMessageBy === "USER") return false;
        return !t.userReadAt || t.userReadAt < t.lastMessageAt;
    }
    if (t.lastMessageBy !== "USER") return false;
    return !t.adminReadAt || t.adminReadAt < t.lastMessageAt;
}

async function notify(to: string, subject: string, html: string) {
    try {
        await sendMail(to, subject, html);
    } catch (err) {
        console.error("[support] falha ao enviar e-mail:", (err as Error).message);
    }
}

async function loadTicketFor(requester: Requester, id: string) {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket || (!isAdmin(requester) && ticket.userId !== requester.userId)) throw new Error("Ticket não encontrado.");
    return ticket;
}

function systemMessage(tx: Prisma.TransactionClient, ticketId: string, body: string, authorId?: string) {
    return tx.ticketMessage.create({ data: { ticketId, authorId: authorId ?? null, authorRole: "SYSTEM", body } });
}

function statusTimestamps(status: TicketStatus) {
    if (status === "RESOLVED") return { resolvedAt: new Date(), closedAt: null };
    if (status === "CLOSED") return { closedAt: new Date() };
    return { resolvedAt: null, closedAt: null };
}

// ---------- Usuário ----------

export async function createTicketUsecase(userId: string, input: unknown, files: UploadedFile[]) {
    const data = createTicketSchema.parse(input);
    const now = new Date();
    const { ticket, message } = await prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.create({
            data: { ...data, userId, lastMessageAt: now, lastMessageBy: "USER", userReadAt: now },
        });
        const message = await tx.ticketMessage.create({
            data: { ticketId: ticket.id, authorId: userId, authorRole: "USER", body: data.description, createdAt: now },
        });
        return { ticket, message };
    });

    try {
        await storeAttachments(ticket.id, message.id, files);
    } catch (err) {
        await prisma.ticket.delete({ where: { id: ticket.id } });
        throw err;
    }

    const [user, admins] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, companyName: true } }),
        prisma.user.findMany({ where: { role: "admin" }, select: { email: true } }),
    ]);
    const label = user ? `${user.name}${user.companyName ? ` (${user.companyName})` : ""} — ${user.email}` : userId;
    for (const a of admins) {
        await notify(
            a.email,
            `[${ticket.severity}] Novo ticket #${ticket.number} — ${ticket.subject}`,
            newTicketAdminEmailTemplate(ticket.number, ticket.severity, ticket.subject, ticket.screen, label, `${APP_URL}/ticket/${ticket.id}`),
        );
    }
    return ticket;
}

export async function listMyTicketsUsecase(userId: string, query: unknown) {
    const f = ticketListFilterSchema.parse(query ?? {});
    const rows = await prisma.ticket.findMany({
        where: {
            userId,
            ...(f.status === "ACTIVE" ? { status: { in: ACTIVE } } : f.status ? { status: f.status } : {}),
            ...(f.severity ? { severity: f.severity } : {}),
        },
        orderBy: { lastMessageAt: "desc" },
        include: { _count: { select: { messages: true, attachments: true } } },
    });
    return rows.map(({ _count, ...t }) => ({
        ...t,
        messageCount: _count.messages,
        attachmentCount: _count.attachments,
        unread: unreadFor("user", t),
    }));
}

// Contadores para os badges: tickets do usuário com resposta nova e, para o admin, a fila.
export async function supportSummaryUsecase(requester: Requester) {
    const mine = await prisma.ticket.findMany({
        where: { userId: requester.userId, status: { not: "CLOSED" } },
        select: { status: true, lastMessageAt: true, lastMessageBy: true, userReadAt: true, adminReadAt: true },
    });
    const summary = {
        unread: mine.filter((t) => unreadFor("user", t)).length,
        open: mine.filter((t) => ACTIVE.includes(t.status)).length,
    };
    if (!isAdmin(requester)) return summary;

    const queue = await prisma.ticket.findMany({
        where: { status: { in: ACTIVE } },
        select: { status: true, severity: true, lastMessageAt: true, lastMessageBy: true, userReadAt: true, adminReadAt: true },
    });
    const count = (pred: (t: (typeof queue)[number]) => boolean) => queue.filter(pred).length;
    return {
        ...summary,
        adminUnread: count((t) => unreadFor("admin", t)),
        active: queue.length,
        bySeverity: { S1: count((t) => t.severity === "S1"), S2: count((t) => t.severity === "S2"), S3: count((t) => t.severity === "S3") },
        byStatus: {
            OPEN: count((t) => t.status === "OPEN"),
            IN_PROGRESS: count((t) => t.status === "IN_PROGRESS"),
            WAITING_USER: count((t) => t.status === "WAITING_USER"),
        },
    };
}

export async function getTicketUsecase(requester: Requester, id: string) {
    const base = await loadTicketFor(requester, id);
    // Abrir o ticket marca como lidas as mensagens do outro lado. O dono lê como usuário
    // (mesmo sendo admin); outro admin lê como suporte.
    const asOwner = base.userId === requester.userId;
    await prisma.ticket.update({ where: { id }, data: asOwner ? { userReadAt: new Date() } : { adminReadAt: new Date() } });

    const ticket = await prisma.ticket.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, email: true, companyName: true, phone: true, plan: true } },
            messages: {
                orderBy: { createdAt: "asc" },
                include: { author: { select: { name: true } }, attachments: { select: attachmentSelect } },
            },
        },
    });
    if (!ticket) throw new Error("Ticket não encontrado.");
    // Contatos do usuário só aparecem para o admin.
    const { user, ...rest } = ticket;
    return { ...rest, isOwner: asOwner, user: isAdmin(requester) ? user : { id: user.id, name: user.name } };
}

export async function addTicketMessageUsecase(requester: Requester, id: string, input: unknown, files: UploadedFile[]) {
    const ticket = await loadTicketFor(requester, id);
    const { body } = ticketMessageSchema.parse(input ?? {});
    if (!body && files.length === 0) throw new Error("Escreva uma mensagem ou anexe um arquivo.");

    const role: TicketAuthorRole = ticket.userId === requester.userId ? "USER" : "ADMIN";
    const now = new Date();

    let nextStatus: TicketStatus | null = null;
    if (role === "ADMIN" && ticket.status === "OPEN") nextStatus = "IN_PROGRESS";
    if (role === "USER" && ticket.status === "WAITING_USER") nextStatus = "IN_PROGRESS";
    if (role === "USER" && (ticket.status === "RESOLVED" || ticket.status === "CLOSED")) nextStatus = "OPEN";

    const message = await prisma.$transaction(async (tx) => {
        const message = await tx.ticketMessage.create({
            data: { ticketId: id, authorId: requester.userId, authorRole: role, body: body || "(arquivo anexado)", createdAt: now },
        });
        if (nextStatus) {
            await systemMessage(
                tx,
                id,
                nextStatus === "OPEN" ? "Ticket reaberto pelo usuário." : `Status alterado para ${TICKET_STATUS_LABEL[nextStatus]}.`,
            );
        }
        await tx.ticket.update({
            where: { id },
            data: {
                lastMessageAt: now,
                lastMessageBy: role,
                ...(role === "USER" ? { userReadAt: now } : { adminReadAt: now }),
                ...(nextStatus ? { status: nextStatus, ...statusTimestamps(nextStatus) } : {}),
            },
        });
        return message;
    });

    try {
        await storeAttachments(id, message.id, files);
    } catch (err) {
        await prisma.ticketMessage.delete({ where: { id: message.id } });
        throw err;
    }

    if (role === "ADMIN") {
        const owner = await prisma.user.findUnique({ where: { id: ticket.userId }, select: { name: true, email: true } });
        if (owner) {
            await notify(
                owner.email,
                `Resposta no seu ticket #${ticket.number} — Fluxy Gestão`,
                ticketUpdateEmailTemplate(owner.name, ticket.number, ticket.subject, "O suporte respondeu ao seu ticket.", `${APP_URL}/ticket/${id}`),
            );
        }
    }
    return message;
}

// O usuário pode fechar o próprio ticket (problema resolvido) ou reabrir um fechado.
export async function userSetTicketStatusUsecase(requester: Requester, id: string, input: unknown) {
    const ticket = await loadTicketFor(requester, id);
    if (ticket.userId !== requester.userId) throw new Error("Ticket não encontrado.");
    const { status } = userCloseTicketSchema.parse(input);
    if (ticket.status === status) return ticket;
    const now = new Date();
    return prisma.$transaction(async (tx) => {
        await systemMessage(tx, id, status === "CLOSED" ? "Ticket fechado pelo usuário." : "Ticket reaberto pelo usuário.", requester.userId);
        return tx.ticket.update({
            where: { id },
            data: { status, ...statusTimestamps(status), lastMessageAt: now, lastMessageBy: "SYSTEM", userReadAt: now },
        });
    });
}

export async function downloadTicketAttachmentUsecase(requester: Requester, attachmentId: string) {
    const att = await prisma.ticketAttachment.findUnique({
        where: { id: attachmentId },
        include: { ticket: { select: { userId: true } } },
    });
    if (!att || (!isAdmin(requester) && att.ticket.userId !== requester.userId)) throw new Error("Arquivo não encontrado.");
    const stream = await getS3Object(att.storageKey);
    return { stream, fileName: att.fileName, mimeType: att.mimeType, size: att.size };
}

// ---------- Admin ----------

export async function adminListTicketsUsecase(query: unknown) {
    const f = ticketListFilterSchema.parse(query ?? {});
    const search = f.search?.replace(/^#/, "");
    const asNumber = search && /^\d+$/.test(search) ? Number(search) : undefined;
    const contains = (v: string) => ({ contains: v, mode: "insensitive" as const });
    const rows = await prisma.ticket.findMany({
        where: {
            ...(f.status === "ACTIVE" ? { status: { in: ACTIVE } } : f.status ? { status: f.status } : {}),
            ...(f.severity ? { severity: f.severity } : {}),
            ...(search
                ? {
                      OR: [
                          ...(asNumber ? [{ number: asNumber }] : []),
                          { subject: contains(search) },
                          { screen: contains(search) },
                          { user: { name: contains(search) } },
                          { user: { email: contains(search) } },
                          { user: { companyName: contains(search) } },
                      ],
                  }
                : {}),
        },
        // Enum em ordem de declaração: S1 (mais grave) primeiro.
        orderBy: [{ severity: "asc" }, { lastMessageAt: "desc" }],
        take: 500,
        include: {
            user: { select: { name: true, email: true, companyName: true } },
            _count: { select: { messages: true, attachments: true } },
        },
    });
    return rows.map(({ _count, ...t }) => ({
        ...t,
        messageCount: _count.messages,
        attachmentCount: _count.attachments,
        unread: unreadFor("admin", t),
    }));
}

export async function adminUpdateTicketUsecase(requester: Requester, id: string, input: unknown) {
    const ticket = await loadTicketFor(requester, id);
    const data = adminUpdateTicketSchema.parse(input);
    const changes: string[] = [];
    if (data.severity && data.severity !== ticket.severity) changes.push(`Nível alterado de ${ticket.severity} para ${data.severity}.`);
    const statusChanged = !!data.status && data.status !== ticket.status;
    if (statusChanged) changes.push(`Status alterado para ${TICKET_STATUS_LABEL[data.status!]}.`);
    if (changes.length === 0) return ticket;

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
        for (const c of changes) await systemMessage(tx, id, c, requester.userId);
        return tx.ticket.update({
            where: { id },
            data: {
                ...(data.severity ? { severity: data.severity } : {}),
                ...(statusChanged ? { status: data.status, ...statusTimestamps(data.status!) } : {}),
                lastMessageAt: now,
                lastMessageBy: "SYSTEM",
                adminReadAt: now,
            },
        });
    });

    if (statusChanged && (data.status === "RESOLVED" || data.status === "WAITING_USER")) {
        const owner = await prisma.user.findUnique({ where: { id: ticket.userId }, select: { name: true, email: true } });
        if (owner) {
            const msg =
                data.status === "RESOLVED"
                    ? "Seu ticket foi marcado como resolvido. Se o problema continuar, é só responder no próprio ticket que ele é reaberto."
                    : "O suporte precisa de uma informação sua para continuar o atendimento.";
            await notify(
                owner.email,
                `Ticket #${ticket.number}: ${TICKET_STATUS_LABEL[data.status]} — Fluxy Gestão`,
                ticketUpdateEmailTemplate(owner.name, ticket.number, ticket.subject, msg, `${APP_URL}/ticket/${id}`),
            );
        }
    }
    return updated;
}

// Chaves dos anexos de um usuário — apagadas do storage quando a conta é excluída.
export async function ticketAttachmentKeysOfUser(userId: string) {
    const rows = await prisma.ticketAttachment.findMany({ where: { ticket: { userId } }, select: { storageKey: true } });
    return rows.map((r) => r.storageKey);
}
