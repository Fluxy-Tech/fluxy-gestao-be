import { prisma } from "../../../infrastructure/database/prisma";
import { cacheKey, invalidate } from "../../../infrastructure/cache/cache";
import { purgeUserDataSchema } from "../../../domain/validation/user.schema";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { invalidateOrdersListCache } from "../order/list-orders.usecase";
import { invalidateDashboardCache } from "../order/get-dashboard.usecase";
import { invalidateServiceCaches } from "../service/list-services.usecase";

// Exclusão definitiva, pelo próprio usuário, de partes da base dele (Configurações >
// Empresa). Apaga de verdade, inclusive registros que já tinham exclusão lógica.
//
// - OS: apaga as OS, os itens e as notas fiscais de serviço (nota sem OS não faz sentido).
// - Clientes: toda OS e nota pertence a um cliente (relação Restrict), então apagar os
//   clientes apaga as OS e notas também.
// - Serviços: se as OS forem mantidas, os itens que apontavam para o serviço viram itens
//   avulsos (serviceId nulo) e mantêm o nome gravado em serviceName, para o histórico.
export async function purgeUserDataUsecase(auditLogRepo: AuditLogRepository, userId: string, input: unknown) {
    const opts = purgeUserDataSchema.parse(input);
    const purgeOrders = opts.orders || opts.clients;

    const deleted = await prisma.$transaction(
        async (tx) => {
            const counts = { orders: 0, orderItems: 0, serviceInvoices: 0, services: 0, clients: 0 };

            if (purgeOrders) {
                counts.orderItems = (await tx.orderItem.deleteMany({ where: { order: { userId } } })).count;
                counts.orders = (await tx.order.deleteMany({ where: { userId } })).count;
                counts.serviceInvoices = (await tx.serviceInvoice.deleteMany({ where: { userId } })).count;
            }

            if (opts.services) {
                if (!purgeOrders) {
                    const services = await tx.service.findMany({ where: { userId }, select: { id: true, name: true } });
                    for (const s of services) {
                        await tx.orderItem.updateMany({ where: { serviceId: s.id, serviceName: null }, data: { serviceName: s.name } });
                    }
                    await tx.orderItem.updateMany({ where: { service: { userId } }, data: { serviceId: null } });
                }
                counts.services = (await tx.service.deleteMany({ where: { userId } })).count;
            }

            if (opts.clients) {
                counts.clients = (await tx.client.deleteMany({ where: { userId } })).count;
            }

            return counts;
        },
        { timeout: 60_000 },
    );

    await Promise.all([
        invalidateOrdersListCache(userId),
        invalidateDashboardCache(userId),
        invalidateServiceCaches(userId),
        invalidate(cacheKey("clients", userId)),
    ]);

    const labels = [purgeOrders && "OS", opts.services && "serviços", opts.clients && "clientes"].filter(Boolean).join(", ");
    await recordAuditLog(auditLogRepo, {
        userId,
        about: `Dados apagados pelo usuário: ${labels}`,
        type: "DELETE",
        entityType: "user-data",
        metadata: { deleted },
    });

    return deleted;
}
