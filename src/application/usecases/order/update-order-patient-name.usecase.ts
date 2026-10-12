import type { OrderRepository } from "../../../domain/repository/order.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { updatePatientNameSchema } from "../../../domain/validation/order.schema";
import { invalidateDashboardCache } from "./get-dashboard.usecase";
import { invalidateOrdersListCache } from "./list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

// O nome do paciente (ramo Laboratório) pode ser corrigido em qualquer status da OS — é só
// identificação e não afeta valores nem o fluxo da OS.
export async function updateOrderPatientNameUsecase(
    orderRepo: OrderRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    orderId: string,
    input: unknown,
) {
    const { patientName } = updatePatientNameSchema.parse(input);

    const order = await orderRepo.updatePatientName(orderId, userId, patientName?.trim() || null);
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Nome do paciente da OS #${order.numberOrder} atualizado`,
        type: "UPDATE",
        entityId: order.id,
        entityType: "Order",
    });
    return order;
}
