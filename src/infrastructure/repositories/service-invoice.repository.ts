import { prisma } from "../database/prisma";
import type {
    CreateServiceInvoiceInput,
    ListServiceInvoiceFilters,
    ServiceInvoiceRepository,
} from "../../domain/repository/service-invoice.repository";

const includeClientAndOrders = {
    client: { select: { name: true } },
    orders: { select: { id: true, numberOrder: true } },
} as const;

export const serviceInvoiceRepository: ServiceInvoiceRepository = {
    findManyByUser(userId, filters: ListServiceInvoiceFilters) {
        return prisma.serviceInvoice.findMany({
            where: {
                userId,
                ...(filters.clientId ? { clientId: filters.clientId } : {}),
                ...(filters.number !== undefined ? { number: BigInt(filters.number) } : {}),
                ...(filters.start || filters.end
                    ? {
                          issueDate: {
                              ...(filters.start ? { gte: filters.start } : {}),
                              ...(filters.end ? { lte: filters.end } : {}),
                          },
                      }
                    : {}),
            },
            include: includeClientAndOrders,
            orderBy: { createdAt: "desc" },
        });
    },

    findDetailById(id, userId) {
        return prisma.serviceInvoice.findFirst({
            where: { id, userId },
            include: includeClientAndOrders,
        });
    },

    async createWithOrders(userId, data: CreateServiceInvoiceInput) {
        return prisma.$transaction(async (tx) => {
            const orders = await tx.order.findMany({
                where: { id: { in: data.orderIds }, userId, clientId: data.clientId, deletedAt: null },
                select: { id: true, totalSale: true, serviceInvoiceId: true },
            });

            if (orders.length !== data.orderIds.length) {
                throw new Error("Uma ou mais OS selecionadas não pertencem a este cliente.");
            }
            if (orders.some((o) => o.serviceInvoiceId !== null)) {
                throw new Error("Uma ou mais OS selecionadas já estão vinculadas a outra nota.");
            }

            const [{ noteSequence }] = await tx.$queryRaw<{ noteSequence: bigint }[]>`
                UPDATE "client" SET "noteSequence" = "noteSequence" + 1
                WHERE id = ${data.clientId} AND "userId" = ${userId}
                RETURNING "noteSequence"
            `;

            const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalSale), 0);

            const invoice = await tx.serviceInvoice.create({
                data: {
                    userId,
                    clientId: data.clientId,
                    number: noteSequence,
                    totalAmount,
                },
            });

            await tx.order.updateMany({
                where: { id: { in: data.orderIds } },
                data: { serviceInvoiceId: invoice.id },
            });

            return invoice;
        });
    },

    async cancel(id, userId, cancelReason) {
        return prisma.$transaction(async (tx) => {
            const invoice = await tx.serviceInvoice.update({
                where: { id, userId },
                data: { status: "CANCELED", canceledAt: new Date(), cancelReason: cancelReason ?? null },
            });

            await tx.order.updateMany({
                where: { serviceInvoiceId: id },
                data: { serviceInvoiceId: null },
            });

            return invoice;
        });
    },

    async settle(id, userId) {
        return prisma.$transaction(async (tx) => {
            const invoice = await tx.serviceInvoice.update({
                where: { id, userId },
                data: { status: "SETTLED", settledAt: new Date() },
            });

            const orders = await tx.order.findMany({
                where: { serviceInvoiceId: id },
                select: { id: true, totalSale: true },
            });

            const now = new Date();
            for (const order of orders) {
                await tx.order.update({
                    where: { id: order.id },
                    data: { paymentStatus: "PAID", amountPaid: order.totalSale, lastPaymentAt: now },
                });
            }

            return invoice;
        });
    },
};
