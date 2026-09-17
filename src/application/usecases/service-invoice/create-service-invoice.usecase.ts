import type { ServiceInvoiceRepository } from "../../../domain/repository/service-invoice.repository";
import type { ClientRepository } from "../../../domain/repository/client.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { createServiceInvoiceSchema } from "../../../domain/validation/service-invoice.schema";
import { invalidateOrdersListCache } from "../order/list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

export async function createServiceInvoiceUsecase(
    repo: ServiceInvoiceRepository,
    clientRepo: ClientRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    input: unknown,
) {
    const data = createServiceInvoiceSchema.parse(input);

    const client = await clientRepo.findById(data.clientId, userId);
    if (!client) throw new Error("Cliente não encontrado.");

    const invoice = await repo.createWithOrders(userId, data);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Nota fiscal #${invoice.number} emitida para ${client.name}`,
        type: "CREATE",
        entityId: invoice.id,
        entityType: "ServiceInvoice",
        metadata: { orderIds: data.orderIds },
    });
    return invoice;
}
