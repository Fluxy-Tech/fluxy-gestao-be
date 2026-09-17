import type { ServiceInvoiceRepository } from "../../../domain/repository/service-invoice.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { updateServiceInvoiceOrdersSchema } from "../../../domain/validation/service-invoice.schema";
import { invalidateOrdersListCache } from "../order/list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

export async function updateServiceInvoiceOrdersUsecase(
    repo: ServiceInvoiceRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
    input: unknown,
) {
    const { orderIds } = updateServiceInvoiceOrdersSchema.parse(input);

    const existing = await repo.findDetailById(id, userId);
    if (!existing) throw new Error("Nota fiscal não encontrada.");

    const invoice = await repo.updateOrders(id, userId, orderIds);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `OS da nota fiscal #${invoice.number} atualizadas`,
        type: "UPDATE",
        entityId: invoice.id,
        entityType: "ServiceInvoice",
        metadata: { orderIds },
    });
    return invoice;
}
