import type { CreateServiceInput, ServiceRepository } from "../../../domain/repository/service.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import type { UserRepository } from "../../../domain/repository/user.repository";
import type { PlanRepository } from "../../../domain/repository/plan.repository";
import { assertPlanLimit } from "../plan/plan-limits";
import { createServiceSchema } from "../../../domain/validation/service.schema";
import { invalidateServiceCaches } from "./list-services.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { defaultCostPrice } from "../../../domain/service-cost";

export async function createServiceUsecase(
    repo: ServiceRepository,
    auditRepo: AuditLogRepository,
    planRepo: PlanRepository,
    userRepo: UserRepository,
    userId: string,
    input: CreateServiceInput,
) {
    const parsed = createServiceSchema.parse(input);
    await assertPlanLimit(planRepo, userRepo, userId, "services");
    // Sem preço de custo informado: 40% do preço de venda.
    const costPrice = parsed.costPrice ?? defaultCostPrice(parsed.salePrice);
    const service = await repo.create(userId, { ...parsed, costPrice });
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
