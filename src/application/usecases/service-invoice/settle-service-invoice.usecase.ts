import type { ServiceInvoiceRepository } from "../../../domain/repository/service-invoice.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { invalidateDashboardCache } from "../order/get-dashboard.usecase";
import { invalidateOrdersListCache } from "../order/list-orders.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { reconcileCashForUser } from "../../../infrastructure/jobs/daily-cash-reconciliation.job";

export async function settleServiceInvoiceUsecase(
    repo: ServiceInvoiceRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
) {
    const existing = await repo.findDetailById(id, userId);
    if (!existing) throw new Error("Nota fiscal não encontrada.");
    if (existing.status !== "ISSUED") {
        throw new Error("Só é possível dar baixa em uma nota que ainda não foi baixada ou cancelada.");
    }

    const invoice = await repo.settle(id, userId);
    await invalidateOrdersListCache(userId);
    await invalidateDashboardCache(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Nota fiscal #${invoice.number} baixada`,
        type: "PAYMENT",
        entityId: invoice.id,
        entityType: "ServiceInvoice",
    });
    // As OS vinculadas viraram PAID agora — atualiza o caixa na hora, como
    // updatePaymentStatusUsecase já faz para pagamentos avulsos de OS.
    await reconcileCashForUser(userId).catch((err) => console.error("[cash-reconciliation] falhou:", err));
    return invoice;
}
