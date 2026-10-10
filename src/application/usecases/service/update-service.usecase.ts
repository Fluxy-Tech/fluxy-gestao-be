import type { ServiceRepository, UpdateServiceInput } from "../../../domain/repository/service.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { updateServiceSchema } from "../../../domain/validation/service.schema";
import { invalidateServiceCaches } from "./list-services.usecase";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { defaultCostPrice } from "../../../domain/service-cost";

export async function updateServiceUsecase(
    repo: ServiceRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    id: string,
    input: UpdateServiceInput,
) {
    const { costPrice, ...rest } = updateServiceSchema.parse(input);
    // Custo apagado na edição (null): volta a ser 40% do preço de venda (o novo, se veio
    // junto, senão o atual). Ausente: o custo não muda.
    let resolvedCost: number | undefined = costPrice ?? undefined;
    if (costPrice === null) {
        const salePrice = rest.salePrice ?? Number((await repo.findById(id, userId))?.salePrice ?? 0);
        resolvedCost = defaultCostPrice(salePrice);
    }
    const service = await repo.update(id, userId, {
        ...rest,
        ...(resolvedCost !== undefined ? { costPrice: resolvedCost } : {}),
    });
    await invalidateServiceCaches(userId);
    await recordAuditLog(auditRepo, {
        userId,
        about: `Serviço "${service.name}" atualizado`,
        type: "UPDATE",
        entityId: service.id,
        entityType: "Service",
    });
    return service;
}
