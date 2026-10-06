import type { DebtRepository } from "../../../domain/repository/debt.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { createDebtSchema } from "../../../domain/validation/debt.schema";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { resolveDebtPayment } from "./resolve-debt-payment";

export async function createDebtUsecase(
    repo: DebtRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    input: unknown,
) {
    const data = createDebtSchema.parse(input);
    const { paymentStatus, amountPaid } = resolveDebtPayment(data.amount, data);

    const debt = await repo.create(userId, {
        id: data.id,
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: data.date,
        paymentStatus,
        amountPaid,
    });
    await recordAuditLog(auditRepo, {
        userId,
        about: `Dívida "${debt.description}" criada`,
        type: "CREATE",
        entityId: debt.id,
        entityType: "Debt",
    });
    return debt;
}
