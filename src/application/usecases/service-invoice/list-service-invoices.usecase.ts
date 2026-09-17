import type { ServiceInvoiceRepository } from "../../../domain/repository/service-invoice.repository";
import { listServiceInvoicesQuerySchema } from "../../../domain/validation/service-invoice.schema";

export function listServiceInvoicesUsecase(repo: ServiceInvoiceRepository, userId: string, query: unknown) {
    const { clientId, number, start, end } = listServiceInvoicesQuerySchema.parse(query);
    return repo.findManyByUser(userId, {
        clientId,
        number: number !== undefined ? BigInt(number) : undefined,
        start: start ? new Date(`${start}T00:00:00`) : undefined,
        end: end ? new Date(`${end}T23:59:59`) : undefined,
    });
}
