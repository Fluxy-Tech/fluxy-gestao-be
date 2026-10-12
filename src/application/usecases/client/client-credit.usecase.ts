import type { ClientCreditRepository } from "../../../domain/repository/client-credit.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { manualCreditSchema } from "../../../domain/validation/client-credit.schema";
import { invalidate, cacheKey } from "../../../infrastructure/cache/cache";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { reconcileCashForUser } from "../../../infrastructure/jobs/daily-cash-reconciliation.job";

export async function getClientCreditUsecase(repo: ClientCreditRepository, userId: string, clientId: string) {
    const statement = await repo.getStatement(clientId, userId);
    if (!statement) throw new Error("Cliente não encontrado.");
    return statement;
}

// Lançamento manual no saldo do cliente: IN = adiantamento/crédito, OUT = devolução/ajuste.
export async function addClientCreditUsecase(
    repo: ClientCreditRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    clientId: string,
    input: unknown,
) {
    const data = manualCreditSchema.parse(input);
    const existing = await repo.getStatement(clientId, userId);
    if (!existing) throw new Error("Cliente não encontrado.");

    const statement = await repo.addManual(clientId, userId, data);
    await invalidate(cacheKey("clients", userId));
    await recordAuditLog(auditRepo, {
        userId,
        about: `${data.type === "IN" ? "Crédito" : "Débito"} de ${data.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} no saldo de "${statement.clientName}"`,
        type: "PAYMENT",
        entityId: clientId,
        entityType: "Client",
        metadata: { ...data },
    });
    if (data.affectsCash) {
        await reconcileCashForUser(userId).catch((err) => console.error("[cash-reconciliation] falhou:", err));
    }
    return statement;
}
