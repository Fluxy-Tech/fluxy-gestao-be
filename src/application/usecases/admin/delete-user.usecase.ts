import type { UserRepository } from "../../../domain/repository/user.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import type { InvoiceRepository } from "../../../domain/repository/invoice.repository";
import { deleteUserSchema } from "../../../domain/validation/admin.schema";
import { closeAccountWithAllData } from "../user/close-account";

// Exclusão definitiva de um usuário pelo admin, com todos os dados dele (clientes,
// serviços, OS, notas, financeiro, faturas, tickets, sessões e logs de auditoria). Não dá
// para excluir a si mesmo nem outro admin. Ver closeAccountWithAllData.
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

    return closeAccountWithAllData(userRepo, auditLogRepo, invoiceRepo, targetUserId, { kind: "admin", adminId });
}
