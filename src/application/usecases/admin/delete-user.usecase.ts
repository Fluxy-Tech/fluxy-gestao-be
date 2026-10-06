import type { UserRepository } from "../../../domain/repository/user.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import type { InvoiceRepository } from "../../../domain/repository/invoice.repository";
import { deleteUserSchema } from "../../../domain/validation/admin.schema";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { cancelAsaasPayment } from "../../../infrastructure/payment/asaas.client";

// Exclusão definitiva de um usuário pelo admin, com todos os dados dele (clientes,
// serviços, OS, notas, financeiro, faturas, sessões e logs de auditoria). Não dá para
// excluir a si mesmo nem outro admin. Boletos pendentes no Asaas são cancelados antes,
// senão o cliente continuaria podendo pagar uma fatura que não existe mais aqui.
export async function deleteUserUsecase(
    userRepo: UserRepository,
    auditLogRepo: AuditLogRepository,
    invoiceRepo: InvoiceRepository,
    adminId: string,
    targetUserId: string,
    input: unknown,
) {
    const { confirmEmail } = deleteUserSchema.parse(input);

    if (targetUserId === adminId) throw new Error("Você não pode excluir a sua própria conta.");
    const user = await userRepo.findById(targetUserId);
    if (!user) throw new Error("Usuário não encontrado.");
    if (user.role === "admin") throw new Error("Não é possível excluir um administrador.");
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
        throw new Error("O e-mail digitado não confere com o do usuário.");
    }

    const pendingInvoices = await invoiceRepo.findPendingWithPaymentId(targetUserId);
    for (const invoice of pendingInvoices) {
        try {
            await cancelAsaasPayment(invoice.asaasPaymentId!);
        } catch (err) {
            console.error(`[billing] falha ao cancelar cobrança ${invoice.asaasPaymentId} no Asaas:`, (err as Error).message);
        }
    }

    const deleted = await userRepo.deleteWithAllData(targetUserId);

    await recordAuditLog(auditLogRepo, {
        userId: adminId,
        about: `Usuário ${user.name} (${user.email}) excluído com todos os dados pelo administrador`,
        type: "DELETE",
        entityId: targetUserId,
        entityType: "user",
        metadata: { name: user.name, email: user.email, companyName: user.companyName, deleted },
    });

    return deleted;
}
