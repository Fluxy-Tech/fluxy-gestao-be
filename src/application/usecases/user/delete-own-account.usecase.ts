import type { UserRepository } from "../../../domain/repository/user.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import type { InvoiceRepository } from "../../../domain/repository/invoice.repository";
import { deleteOwnAccountSchema } from "../../../domain/validation/user.schema";
import { closeAccountWithAllData } from "./close-account";

// Exclusão da própria conta (LGPD art. 18, VI; exigência da App Store e do Google Play).
// O usuário redigita o e-mail para confirmar. Admin não se exclui por aqui — evita ficar
// sem nenhum administrador por engano.
export async function deleteOwnAccountUsecase(
    userRepo: UserRepository,
    auditLogRepo: AuditLogRepository,
    invoiceRepo: InvoiceRepository,
    userId: string,
    input: unknown,
) {
    const { confirmEmail } = deleteOwnAccountSchema.parse(input);
    const user = await userRepo.findById(userId);
    if (!user) throw new Error("Usuário não encontrado.");
    if (user.role === "admin") throw new Error("Administradores não podem excluir a própria conta por aqui.");
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
        throw new Error("O e-mail digitado não confere com o da sua conta.");
    }
    return closeAccountWithAllData(userRepo, auditLogRepo, invoiceRepo, userId, { kind: "self" });
}
