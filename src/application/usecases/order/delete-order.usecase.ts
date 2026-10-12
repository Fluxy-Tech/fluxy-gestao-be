import type { OrderRepository } from "../../../domain/repository/order.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { invalidateDashboardCache } from "./get-dashboard.usecase";
import { invalidateOrdersListCache } from "./list-orders.usecase";
import { invalidate, cacheKey } from "../../../infrastructure/cache/cache";

export async function deleteOrderUsecase(
    repo: OrderRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
) {
    const order = await repo.findDetailById(id, userId);
    if (!order) throw new Error("Ordem de serviço não encontrada.");

    await repo.softDelete(id, userId);
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    // A exclusão devolve ao cliente o saldo usado nesta OS.
    await invalidate(cacheKey("clients", userId));
    await recordAuditLog(auditRepo, {
        userId,
        about: `OS #${order.numberOrder} excluída`,
        type: "DELETE",
        entityId: order.id,
        entityType: "Order",
    });
}
