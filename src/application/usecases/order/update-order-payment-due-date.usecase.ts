import type { OrderRepository } from "../../../domain/repository/order.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { updatePaymentDueDateSchema } from "../../../domain/validation/order.schema";
import { invalidateDashboardCache } from "./get-dashboard.usecase";
import { invalidateOrdersListCache } from "./list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

// A data prevista de pagamento pode ser alterada em qualquer status da OS. Chega só a data
// ("yyyy-mm-dd"); gravamos ao meio-dia de Brasília pra que o dia exibido (America/Sao_Paulo)
// seja o mesmo escolhido — meia-noite UTC cairia no dia anterior.
export async function updateOrderPaymentDueDateUsecase(
    orderRepo: OrderRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    orderId: string,
    input: unknown,
) {
    const { paymentDueDate } = updatePaymentDueDateSchema.parse(input);

    const order = await orderRepo.updatePaymentDueDate(
        orderId,
        userId,
        paymentDueDate ? new Date(`${paymentDueDate}T12:00:00-03:00`) : null,
    );
    await invalidateDashboardCache(userId);
    await invalidateOrdersListCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Data prevista de pagamento da OS #${order.numberOrder} atualizada`,
        type: "UPDATE",
        entityId: order.id,
        entityType: "Order",
    });
    return order;
}
