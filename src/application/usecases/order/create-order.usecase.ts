import type { CreateOrderInput, OrderRepository } from "../../../domain/repository/order.repository";
import type { ClientRepository } from "../../../domain/repository/client.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import type { UserRepository } from "../../../domain/repository/user.repository";
import type { PlanRepository } from "../../../domain/repository/plan.repository";
import { assertPlanLimit } from "../plan/plan-limits";
import { createOrderSchema } from "../../../domain/validation/order.schema";
import { resolveDeliveryDate } from "../../../domain/order-scheduling";
import { invalidateDashboardCache } from "./get-dashboard.usecase";
import { invalidateOrdersListCache } from "./list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

export async function createOrderUsecase(
    orderRepo: OrderRepository,
    clientRepo: ClientRepository,
    userRepo: UserRepository,
    auditRepo: AuditLogRepository,
    planRepo: PlanRepository,
    userId: string,
    input: CreateOrderInput,
) {
    const data = createOrderSchema.parse(input);
    // OS geradas pelo job de recorrência não passam por aqui (gravam direto no repositório),
    // então uma OS fixa continua se repetindo mesmo com o limite mensal atingido.
    await assertPlanLimit(planRepo, userRepo, userId, "orders");

    const [client, user] = await Promise.all([
        clientRepo.findById(data.clientId, userId),
        userRepo.findById(userId),
    ]);
    if (!client) throw new Error("Cliente não encontrado.");
    if (!user) throw new Error("Usuário não encontrado.");

    const order = await orderRepo.createWithItems(userId, {
        ...data,
        deliveryDate: resolveDeliveryDate(user, data.deliveryDate),
    });
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `OS #${order.numberOrder} criada`,
        type: "CREATE",
        entityId: order.id,
        entityType: "Order",
    });
    return order;
}
