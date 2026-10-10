import type { OrderRepository } from "../../../domain/repository/order.repository";
import type { UserRepository } from "../../../domain/repository/user.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { updateScheduleSchema } from "../../../domain/validation/order.schema";
import { collectsTime, resolveDeliveryDate } from "../../../domain/order-scheduling";
import { invalidateDashboardCache } from "./get-dashboard.usecase";
import { invalidateOrdersListCache } from "./list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

// Reagendar (mudar dia/horário de uma OS já criada) só faz sentido pra quem coleta horário
// nas OS (ramo com agenda ou agenda ativa em Empresa) — os demais editam a data de entrega
// pela tela de OS normalmente, não por aqui.
export async function updateOrderScheduleUsecase(
    orderRepo: OrderRepository,
    userRepo: UserRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    orderId: string,
    input: unknown,
) {
    const { deliveryDate } = updateScheduleSchema.parse(input);

    const user = await userRepo.findById(userId);
    if (!user) throw new Error("Usuário não encontrado.");
    if (!collectsTime(user)) {
        throw new Error("Reagendamento disponível apenas com a agenda de horário ativa.");
    }

    const resolved = resolveDeliveryDate(user, deliveryDate);
    const order = await orderRepo.updateDeliveryDate(orderId, userId, resolved ? new Date(resolved) : null);
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Agendamento da OS #${order.numberOrder} atualizado`,
        type: "UPDATE",
        entityId: order.id,
        entityType: "Order",
    });
    return order;
}
