import { prisma } from "../../../infrastructure/database/prisma";
import type { UserRepository } from "../../../domain/repository/user.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import type { InvoiceRepository } from "../../../domain/repository/invoice.repository";
import { cancelAsaasPayment } from "../../../infrastructure/payment/asaas.client";
import { deleteFromS3 } from "../../../infrastructure/storage/s3-storage";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { ticketAttachmentKeysOfUser } from "../support/support.usecases";

// Encerramento definitivo de uma conta com todos os dados — pelo próprio usuário
// (Perfil > Excluir conta) ou pelo admin. Antes de apagar:
// - cancela no Asaas os boletos pendentes (senão o cliente pagaria uma fatura que não
//   existe mais aqui);
// - apaga do storage os anexos de tickets e a logo;
// - grava um registro de encerramento (audit_log sem vínculo com o usuário) com o mínimo
//   que a Política de Privacidade diz que guardamos após a exclusão: identificação,
//   faturas (obrigação fiscal, 5 anos), aceite dos termos/contrato e últimos acessos
//   (Marco Civil, 6 meses).
export async function closeAccountWithAllData(
    userRepo: UserRepository,
    auditLogRepo: AuditLogRepository,
    invoiceRepo: InvoiceRepository,
    userId: string,
    actor: { kind: "self" } | { kind: "admin"; adminId: string },
) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Usuário não encontrado.");

    const [invoices, sessions, attachmentKeys] = await Promise.all([
        prisma.invoice.findMany({
            where: { userId },
            select: { referenceMonth: true, amount: true, status: true, dueDate: true, paidAt: true, asaasPaymentId: true },
        }),
        prisma.session.findMany({ where: { userId }, select: { ipAddress: true, userAgent: true, createdAt: true } }),
        ticketAttachmentKeysOfUser(userId),
    ]);

    const pendingInvoices = await invoiceRepo.findPendingWithPaymentId(userId);
    for (const invoice of pendingInvoices) {
        try {
            await cancelAsaasPayment(invoice.asaasPaymentId!);
        } catch (err) {
            console.error(`[billing] falha ao cancelar cobrança ${invoice.asaasPaymentId} no Asaas:`, (err as Error).message);
        }
    }

    const deleted = await userRepo.deleteWithAllData(userId);

    const publicBase = process.env.UPLOAD_PUBLIC_BASE_URL;
    const logoKey = publicBase && user.logoUrl?.startsWith(`${publicBase}/`) ? user.logoUrl.slice(publicBase.length + 1) : null;
    await deleteFromS3([...attachmentKeys, ...(logoKey ? [logoKey] : [])]);

    await recordAuditLog(auditLogRepo, {
        userId: actor.kind === "admin" ? actor.adminId : null,
        about:
            actor.kind === "self"
                ? `Conta de ${user.name} (${user.email}) excluída pelo próprio usuário`
                : `Usuário ${user.name} (${user.email}) excluído com todos os dados pelo administrador`,
        type: "DELETE",
        entityId: userId,
        entityType: "account_closure",
        metadata: {
            closedBy: actor.kind,
            closedAt: new Date().toISOString(),
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            cnpj: user.cnpj,
            companyName: user.companyName,
            plan: user.plan,
            accountCreatedAt: user.createdAt.toISOString(),
            contractAcceptedAt: user.contractAcceptedAt?.toISOString() ?? null,
            invoices: invoices.map((i) => ({
                referenceMonth: i.referenceMonth,
                amount: Number(i.amount),
                status: i.status,
                dueDate: i.dueDate.toISOString(),
                paidAt: i.paidAt?.toISOString() ?? null,
                asaasPaymentId: i.asaasPaymentId,
            })),
            lastAccesses: sessions.map((s) => ({ ip: s.ipAddress, userAgent: s.userAgent, at: s.createdAt.toISOString() })),
            deleted,
        },
    });

    return deleted;
}
