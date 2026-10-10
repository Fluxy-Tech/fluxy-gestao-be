import cron from "node-cron";
import { prisma } from "../database/prisma";
import { nextOrderOccurrence } from "../../domain/order-recurrence";
import { invalidateDashboardCache } from "../../application/usecases/order/get-dashboard.usecase";
import { invalidateOrdersListCache } from "../../application/usecases/order/list-orders.usecase";
import { recordAuditLog } from "../../application/usecases/audit/record-audit-log.usecase";
import { auditLogRepository } from "../repositories/audit-log.repository";
import type { Order, OrderItem } from "../../../generated/prisma/client";

type Template = Order & { orderItems: OrderItem[] };

// Clona a OS "template" (a que o usuário marcou como fixa) numa nova OS real, pronta pra
// ser atendida/paga — mesmo cliente, paciente, forma de pagamento e itens/preços do
// template. A ocorrência gerada nasce sem recurWeekly/recurMonthly (só o template guarda
// essas flags), pra não iniciar uma série recursiva própria.
async function generateOccurrence(template: Template, occurrenceDate: Date): Promise<Order> {
    return prisma.$transaction(async (tx) => {
        const [{ orderSequence }] = await tx.$queryRaw<{ orderSequence: bigint }[]>`
            UPDATE "user" SET "orderSequence" = "orderSequence" + 1
            WHERE id = ${template.userId}
            RETURNING "orderSequence"
        `;

        const order = await tx.order.create({
            data: {
                userId: template.userId,
                clientId: template.clientId,
                numberOrder: orderSequence,
                patientName: template.patientName,
                notes: template.notes,
                paymentMethod: template.paymentMethod,
                entryDate: occurrenceDate,
                deliveryDate: occurrenceDate,
                discount: template.discount,
                increase: template.increase,
                totalCost: template.totalCost,
                totalSale: template.totalSale,
                createdBy: template.userId,
                recurringParentId: template.id,
            },
        });

        await tx.orderItem.createMany({
            data: template.orderItems.map((item) => ({
                orderId: order.id,
                serviceId: item.serviceId,
                serviceName: item.serviceName,
                userId: template.userId,
                costPrice: item.costPrice,
                salePrice: item.salePrice,
                discount: item.discount,
                increase: item.increase,
                quantity: item.quantity,
                finalPrice: item.finalPrice,
            })),
        });

        return order;
    });
}

// Roda todo dia à meia-noite: para cada OS fixa cuja próxima ocorrência já venceu, gera a
// nova OS real (recuperando o atraso e gerando todas as ocorrências perdidas, caso o job
// fique parado por mais de um dia) e avança o watermark nextOccurrenceAt do template. Uma
// série "só semanal" termina sozinha (nextOccurrenceAt vira null) ao cruzar pro mês
// seguinte — ver domain/order-recurrence.ts.
export async function runRecurringOrders(): Promise<void> {
    const now = new Date();
    const templates = await prisma.order.findMany({
        where: {
            deletedAt: null,
            statusOrder: { not: "CANCELED" },
            nextOccurrenceAt: { not: null, lte: now },
        },
        include: { orderItems: true },
    });

    const touchedUsers = new Set<string>();
    let generated = 0;

    for (const template of templates) {
        try {
            const originDate = template.deliveryDate ?? template.entryDate;
            let cursor: Date | null = template.nextOccurrenceAt;

            while (cursor && cursor <= now) {
                const order = await generateOccurrence(template, cursor);
                generated++;
                touchedUsers.add(template.userId);
                await recordAuditLog(auditLogRepository, {
                    userId: template.userId,
                    about: `OS #${order.numberOrder} gerada automaticamente pela OS fixa #${template.numberOrder}`,
                    type: "CREATE",
                    entityId: order.id,
                    entityType: "Order",
                });
                cursor = nextOrderOccurrence(originDate, cursor, template.recurWeekly, template.recurMonthly);
            }

            await prisma.order.update({
                where: { id: template.id },
                data: { nextOccurrenceAt: cursor },
            });
        } catch (err) {
            console.error(`[recurring-orders] falhou para a OS fixa #${template.numberOrder} (usuário ${template.userId}):`, (err as Error).message);
        }
    }

    for (const userId of touchedUsers) {
        await invalidateDashboardCache(userId);
        await invalidateOrdersListCache(userId);
    }

    console.log(`[recurring-orders] ${generated} OS gerada(s) a partir de ${templates.length} OS fixa(s) em ${now.toISOString()}`);
}

export function scheduleRecurringOrders(): void {
    cron.schedule("0 0 * * *", () => {
        runRecurringOrders().catch((err) => console.error("[recurring-orders] job falhou:", err));
    });
}
