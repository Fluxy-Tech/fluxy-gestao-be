import type { ServiceInvoiceRepository } from "../../../domain/repository/service-invoice.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { invalidateOrdersListCache } from "../order/list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

export async function reopenServiceInvoiceUsecase(
    repo: ServiceInvoiceRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
) {
    const existing = await repo.findDetailById(id, userId);
    if (!existing) throw new Error("Nota fiscal não encontrada.");
    if (existing.status !== "CANCELED") {
        throw new Error("Só é possível reabrir uma nota cancelada.");
    }

    const invoice = await repo.reopen(id, userId);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Nota fiscal #${invoice.number} reaberta`,
        type: "STATUS_CHANGE",
        entityId: invoice.id,
        entityType: "ServiceInvoice",
    });
    return invoice;
}
