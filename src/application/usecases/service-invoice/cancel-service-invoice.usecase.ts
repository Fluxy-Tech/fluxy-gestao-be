import type { ServiceInvoiceRepository } from "../../../domain/repository/service-invoice.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { cancelServiceInvoiceSchema } from "../../../domain/validation/service-invoice.schema";
import { invalidateOrdersListCache } from "../order/list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

export async function cancelServiceInvoiceUsecase(
    repo: ServiceInvoiceRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
    input: unknown,
) {
    const { cancelReason } = cancelServiceInvoiceSchema.parse(input ?? {});

    const existing = await repo.findDetailById(id, userId);
    if (!existing) throw new Error("Nota fiscal não encontrada.");
    if (existing.status !== "ISSUED") {
        throw new Error("Só é possível cancelar uma nota que ainda não foi baixada ou cancelada.");
    }

    const invoice = await repo.cancel(id, userId, cancelReason ?? null);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Nota fiscal #${invoice.number} cancelada`,
        type: "STATUS_CHANGE",
        entityId: invoice.id,
        entityType: "ServiceInvoice",
        metadata: cancelReason ? { cancelReason } : null,
    });
    return invoice;
}
