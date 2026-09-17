import type { UserRepository } from "../../../domain/repository/user.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import type { InvoiceRepository } from "../../../domain/repository/invoice.repository";
import { setBillingExemptSchema } from "../../../domain/validation/admin.schema";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { cancelAsaasPayment } from "../../../infrastructure/payment/asaas.client";

// Isenção de cobrança definida pelo admin (ex.: funcionários que usam a plataforma sem
// pagar). Isenta o usuário tanto da exigência de aceite de contrato quanto da geração de
// fatura/boleto (ver findBillableBeforeMonth e requireActiveBilling).
//
// Ao isentar, também cancela qualquer boleto ainda pendente que já tenha sido gerado
// antes do admin marcar a isenção (ex.: o job diário rodou mais cedo no mesmo dia, antes
// da flag ser setada) — sem isso o usuário continua vendo/podendo pagar um boleto mesmo
// já isento.
export async function setBillingExemptUsecase(
    userRepo: UserRepository,
    auditLogRepo: AuditLogRepository,
    invoiceRepo: InvoiceRepository,
    targetUserId: string,
    input: unknown,
) {
    const { exempt } = setBillingExemptSchema.parse(input);
    await userRepo.setBillingExempt(targetUserId, exempt);
    await recordAuditLog(auditLogRepo, {
        userId: targetUserId,
        about: exempt ? "Isento de cobrança pelo administrador" : "Cobrança reativada pelo administrador",
        type: "STATUS_CHANGE",
    });

    if (!exempt) return;

    const pendingInvoices = await invoiceRepo.findPendingWithPaymentId(targetUserId);
    for (const invoice of pendingInvoices) {
        try {
            await cancelAsaasPayment(invoice.asaasPaymentId!);
        } catch (err) {
            console.error(`[billing] falha ao cancelar cobrança ${invoice.asaasPaymentId} no Asaas:`, (err as Error).message);
        }
        await invoiceRepo.cancel(invoice.id);
    }
}
