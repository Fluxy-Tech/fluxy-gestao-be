import type { ServiceInvoiceRepository } from "../../../domain/repository/service-invoice.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { updateServiceInvoicePaymentSchema } from "../../../domain/validation/service-invoice.schema";
import { invalidateDashboardCache } from "../order/get-dashboard.usecase";
import { invalidateOrdersListCache } from "../order/list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { reconcileCashForUser } from "../../../infrastructure/jobs/daily-cash-reconciliation.job";

const PAYMENT_LABEL = { PENDING: "pendente", PARTIAL: "parcial", PAID: "completo" } as const;

export async function updateServiceInvoicePaymentUsecase(
    repo: ServiceInvoiceRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
    input: unknown,
) {
    const { paymentStatus, amountPaid: requestedAmountPaid } = updateServiceInvoicePaymentSchema.parse(input);

    const existing = await repo.findDetailById(id, userId);
    if (!existing) throw new Error("Nota fiscal não encontrada.");
    if (existing.status !== "ISSUED") {
        throw new Error("Só é possível alterar o pagamento de uma nota em aberto.");
    }
    const totalAmount = Number(existing.totalAmount);

    let amountPaid = 0;
    if (paymentStatus === "PAID") {
        amountPaid = totalAmount;
    } else if (paymentStatus === "PARTIAL") {
        if (requestedAmountPaid === undefined) throw new Error("Informe o valor pago.");
        if (requestedAmountPaid <= 0 || requestedAmountPaid >= totalAmount) {
            throw new Error("Para pagamento parcial, o valor pago deve ser maior que zero e menor que o total da nota.");
        }
        amountPaid = requestedAmountPaid;
    }

    const invoice = await repo.updatePayment(id, userId, { paymentStatus, amountPaid });
    await invalidateOrdersListCache(userId);
    await invalidateDashboardCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Pagamento da nota fiscal #${invoice.number} atualizado para ${PAYMENT_LABEL[paymentStatus]}`,
        type: "PAYMENT",
        entityId: invoice.id,
        entityType: "ServiceInvoice",
        metadata: { paymentStatus, amountPaid },
    });
    // O valor pago foi distribuído entre as OS vinculadas — atualiza o caixa na hora.
    await reconcileCashForUser(userId).catch((err) => console.error("[cash-reconciliation] falhou:", err));
    return invoice;
}
