import type { OrderRepository } from "../../../domain/repository/order.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { updateNotesSchema } from "../../../domain/validation/order.schema";
import { invalidateDashboardCache } from "./get-dashboard.usecase";
import { invalidateOrdersListCache } from "./list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

// As observações podem ser editadas em qualquer status da OS — inclusive finalizada ou
// cancelada —, já que são só anotações e não afetam valores nem o fluxo da OS.
export async function updateOrderNotesUsecase(
    orderRepo: OrderRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    orderId: string,
    input: unknown,
) {
    const { notes } = updateNotesSchema.parse(input);

    const order = await orderRepo.updateNotes(orderId, userId, notes?.trim() || null);
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Observações da OS #${order.numberOrder} atualizadas`,
        type: "UPDATE",
        entityId: order.id,
        entityType: "Order",
    });
    return order;
}
