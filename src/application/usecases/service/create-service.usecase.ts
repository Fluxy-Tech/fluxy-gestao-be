import type { CreateServiceInput, ServiceRepository } from "../../../domain/repository/service.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import type { UserRepository } from "../../../domain/repository/user.repository";
import type { PlanRepository } from "../../../domain/repository/plan.repository";
import { assertPlanLimit } from "../plan/plan-limits";
import { createServiceSchema } from "../../../domain/validation/service.schema";
import { invalidateServiceCaches } from "./list-services.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

export async function createServiceUsecase(
    repo: ServiceRepository,
    auditRepo: AuditLogRepository,
    planRepo: PlanRepository,
    userRepo: UserRepository,
    userId: string,
    input: CreateServiceInput,
) {
    const data = createServiceSchema.parse(input);
    await assertPlanLimit(planRepo, userRepo, userId, "services");
    const service = await repo.create(userId, data);
    await invalidateServiceCaches(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Serviço "${service.name}" criado`,
        type: "CREATE",
        entityId: service.id,
        entityType: "Service",
    });
    return service;
}
