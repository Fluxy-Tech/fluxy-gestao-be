import { prisma } from "../../../infrastructure/database/prisma";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import {
    announcementSchema,
    markAnnouncementsReadSchema,
    updateAnnouncementSchema,
} from "../../../domain/validation/announcement.schema";

// Anúncios da Comunidade. O sino do cabeçalho mostra os não vistos; assim que o usuário
// abre o sino ou a tela Comunidade, eles são marcados como vistos (AnnouncementRead) e
// não notificam mais. Anúncios publicados antes de a conta existir já contam como vistos
// — aparecem só no histórico.

const HISTORY_LIMIT = 100;

export async function listAnnouncementsForUserUsecase(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (!user) throw new Error("Usuário não encontrado.");

    const rows = await prisma.announcement.findMany({
        where: { published: true, publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: "desc" },
        take: HISTORY_LIMIT,
        select: {
            id: true,
            title: true,
            body: true,
            kind: true,
            publishedAt: true,
            reads: { where: { userId }, select: { readAt: true } },
        },
    });

    const items = rows.map(({ reads, ...a }) => ({
        ...a,
        read: reads.length > 0 || a.publishedAt < user.createdAt,
        readAt: reads[0]?.readAt ?? null,
    }));
    return { items, unread: items.filter((a) => !a.read).length };
}

export async function markAnnouncementsReadUsecase(userId: string, input: unknown) {
    const { ids } = markAnnouncementsReadSchema.parse(input ?? {});
    const targets = await prisma.announcement.findMany({
        where: {
            published: true,
            publishedAt: { lte: new Date() },
            ...(ids?.length ? { id: { in: ids } } : {}),
            reads: { none: { userId } },
        },
        select: { id: true },
    });
    if (targets.length === 0) return { marked: 0 };
    const res = await prisma.announcementRead.createMany({
        data: targets.map((t) => ({ announcementId: t.id, userId })),
        skipDuplicates: true,
    });
    return { marked: res.count };
}

// ---------- Admin ----------

export async function adminListAnnouncementsUsecase() {
    const [rows, totalUsers] = await Promise.all([
        prisma.announcement.findMany({
            orderBy: { publishedAt: "desc" },
            include: { _count: { select: { reads: true } } },
        }),
        prisma.user.count(),
    ]);
    return {
        totalUsers,
        items: rows.map(({ _count, ...a }) => ({ ...a, readCount: _count.reads })),
    };
}

export async function adminCreateAnnouncementUsecase(auditLogRepo: AuditLogRepository, adminId: string, input: unknown) {
    const data = announcementSchema.parse(input);
    const created = await prisma.announcement.create({ data: { ...data, createdById: adminId } });
    await recordAuditLog(auditLogRepo, {
        userId: adminId,
        about: `Anúncio criado: ${created.title}`,
        type: "CREATE",
        entityId: created.id,
        entityType: "announcement",
    });
    return created;
}

export async function adminUpdateAnnouncementUsecase(auditLogRepo: AuditLogRepository, adminId: string, id: string, input: unknown) {
    const data = updateAnnouncementSchema.parse(input);
    const current = await prisma.announcement.findUnique({ where: { id } });
    if (!current) throw new Error("Anúncio não encontrado.");
    // Publicar um rascunho conta como publicação nova: entra no sino a partir de agora.
    const republish = data.published === true && !current.published;
    const updated = await prisma.announcement.update({
        where: { id },
        data: { ...data, ...(republish ? { publishedAt: new Date() } : {}) },
    });
    await recordAuditLog(auditLogRepo, {
        userId: adminId,
        about: `Anúncio atualizado: ${updated.title}`,
        type: "UPDATE",
        entityId: id,
        entityType: "announcement",
    });
    return updated;
}

export async function adminDeleteAnnouncementUsecase(auditLogRepo: AuditLogRepository, adminId: string, id: string) {
    const deleted = await prisma.announcement.delete({ where: { id } });
    await recordAuditLog(auditLogRepo, {
        userId: adminId,
        about: `Anúncio excluído: ${deleted.title}`,
        type: "DELETE",
        entityId: id,
        entityType: "announcement",
    });
}
