import type { ClientRepository, CreateClientInput } from "../../../domain/repository/client.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import type { UserRepository } from "../../../domain/repository/user.repository";
import type { PlanRepository } from "../../../domain/repository/plan.repository";
import { assertPlanLimit } from "../plan/plan-limits";
import { createClientSchema } from "../../../domain/validation/client.schema";
import { invalidate, cacheKey } from "../../../infrastructure/cache/cache";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

export async function createClientUsecase(
    repo: ClientRepository,
    auditRepo: AuditLogRepository,
    planRepo: PlanRepository,
    userRepo: UserRepository,
    userId: string,
    input: CreateClientInput,
) {
    const data = createClientSchema.parse(input);
    await assertPlanLimit(planRepo, userRepo, userId, "clients");
    const client = await repo.create(userId, data);
    await invalidate(cacheKey("clients", userId));
    await recordAuditLog(auditRepo, {
        userId,
        about: `Cliente "${client.name}" criado`,
        type: "CREATE",
        entityId: client.id,
        entityType: "Client",
    });
    return client;
}
