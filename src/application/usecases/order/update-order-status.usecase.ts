import type { OrderRepository } from "../../../domain/repository/order.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { cancelOrderSchema, updateOrderItemsSchema, updatePaymentStatusSchema } from "../../../domain/validation/order.schema";
import { invalidateDashboardCache } from "./get-dashboard.usecase";
import { invalidateOrdersListCache } from "./list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { reconcileCashForUser } from "../../../infrastructure/jobs/daily-cash-reconciliation.job";
import { invalidate, cacheKey } from "../../../infrastructure/cache/cache";

export async function completeOrderUsecase(
    repo: OrderRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
) {
    const order = await repo.updateStatus(id, userId, {
        statusOrder: "COMPLETED",
        completedAt: new Date(),
    });
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `OS #${order.numberOrder} concluída`,
        type: "STATUS_CHANGE",
        entityId: order.id,
        entityType: "Order",
    });
    // Uma OS concluída já paga/parcial (ex.: pagamento lançado antes da entrega) deve
    // refletir no caixa imediatamente, sem esperar o botão manual ou o job da meia-noite.
    await reconcileCashForUser(userId).catch((err) => console.error("[cash-reconciliation] falhou:", err));
    return order;
}

export async function reopenOrderUsecase(
    repo: OrderRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
) {
    const order = await repo.updateStatus(id, userId, {
        statusOrder: "PENDING",
        completedAt: null,
        canceledAt: null,
        cancelReason: null,
    });
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `OS #${order.numberOrder} reativada`,
        type: "STATUS_CHANGE",
        entityId: order.id,
        entityType: "Order",
    });
    return order;
}

export async function cancelOrderUsecase(
    repo: OrderRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
    input: unknown,
) {
    const { cancelReason } = cancelOrderSchema.parse(input ?? {});
    const order = await repo.updateStatus(id, userId, {
        statusOrder: "CANCELED",
        canceledAt: new Date(),
        cancelReason: cancelReason ?? null,
    });
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `OS #${order.numberOrder} cancelada`,
        type: "STATUS_CHANGE",
        entityId: order.id,
        entityType: "Order",
        metadata: cancelReason ? { cancelReason } : null,
    });
    return order;
}

export async function updateOrderItemsUsecase(
    repo: OrderRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
    input: unknown,
) {
    const data = updateOrderItemsSchema.parse(input);

    const existing = await repo.findDetailById(id, userId);
    if (!existing) throw new Error("Ordem de serviço não encontrada.");
    // Só permite editar os itens enquanto a OS está aberta — depois de concluída/paga os
    // totais já podem ter sido usados na conciliação de caixa (ver reconcileUserCash).
    if (existing.statusOrder !== "PENDING") {
        throw new Error("Só é possível editar os serviços de uma OS em aberto.");
    }

    const order = await repo.updateItems(id, userId, data);
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Serviços da OS #${order.numberOrder} atualizados`,
        type: "UPDATE",
        entityId: order.id,
        entityType: "Order",
    });
    return order;
}

export async function updatePaymentStatusUsecase(
    repo: OrderRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
    input: unknown,
) {
    const { paymentStatus, amountPaid: requestedAmountPaid, useCredit, overpayment } =
        updatePaymentStatusSchema.parse(input);
    if (overpayment && paymentStatus !== "PAID") {
        throw new Error("Valor recebido a mais só pode ser lançado com pagamento completo.");
    }

    const existing = await repo.findDetailById(id, userId);
    if (!existing) throw new Error("Ordem de serviço não encontrada.");
    const totalSale = Number(existing.totalSale);

    let amountPaid: number;
    if (paymentStatus === "PAID") {
        amountPaid = totalSale;
    } else if (paymentStatus === "PARTIAL") {
        if (requestedAmountPaid === undefined) throw new Error("Informe o valor pago.");
        if (requestedAmountPaid <= 0 || requestedAmountPaid >= totalSale) {
            throw new Error("Para pagamento parcial, o valor pago deve ser maior que zero e menor que o total da OS.");
        }
        amountPaid = requestedAmountPaid;
    } else {
        amountPaid = 0;
    }

    const order = await repo.updatePaymentStatus(id, userId, { paymentStatus, amountPaid, useCredit, overpayment });
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    await invalidate(cacheKey("clients", userId));
    await recordAuditLog(auditRepo, {
        userId,
        about: `Pagamento da OS #${order.numberOrder} atualizado para ${paymentStatus}`,
        type: "PAYMENT",
        entityId: order.id,
        entityType: "Order",
        metadata: { paymentStatus, amountPaid, useCredit: useCredit ?? 0, overpayment: overpayment ?? 0 },
    });
    // É aqui que o dinheiro efetivamente entra (cashRevenue depende de paymentStatus) —
    // atualiza o caixa na hora, em vez de depender do botão manual ou do job noturno.
    await reconcileCashForUser(userId).catch((err) => console.error("[cash-reconciliation] falhou:", err));
    return order;
}
