import { prisma } from "../database/prisma";
import type {
    CreateOrderInput,
    DashboardCounts,
    OrderRepository,
    UpdateOrderItemsInput,
    UpdatePaymentInput,
} from "../../domain/repository/order.repository";
import type { OrderStatus } from "../../../generated/prisma/client";
import { nextOrderOccurrence } from "../../domain/order-recurrence";

export const orderRepository: OrderRepository = {
    findOpenByUser(userId) {
        return prisma.order.findMany({
            where: {
                userId,
                deletedAt: null,
                statusOrder: { notIn: ["COMPLETED", "CANCELED"] },
            },
            include: { client: { select: { name: true } } },
            orderBy: { entryDate: "desc" },
        });
    },

    findClosedByUser(userId) {
        return prisma.order.findMany({
            where: {
                userId,
                deletedAt: null,
                // Canceladas ficam aqui junto com as pagas para permitir reativação
                // (ver reopenOrderUsecase) caso o cliente volte atrás.
                OR: [
                    { statusOrder: "COMPLETED", paymentStatus: "PAID" },
                    { statusOrder: "CANCELED" },
                ],
            },
            include: { client: { select: { name: true } } },
            orderBy: { entryDate: "desc" },
        });
    },

    findReceivableByUser(userId) {
        return prisma.order.findMany({
            where: {
                userId,
                deletedAt: null,
                statusOrder: "COMPLETED",
                paymentStatus: { not: "PAID" },
            },
            include: { client: { select: { name: true } } },
            orderBy: { entryDate: "desc" },
        });
    },

    findByClientId(userId, clientId) {
        return prisma.order.findMany({
            where: { userId, clientId, deletedAt: null },
            include: {
                orderItems: { include: { service: { select: { name: true } } } },
                serviceInvoice: { select: { status: true } },
            },
            orderBy: { entryDate: "desc" },
        }).then((orders) =>
            orders.map(({ orderItems, ...rest }) => ({ ...rest, items: orderItems }) as any),
        );
    },

    findDetailById(id, userId) {
        return prisma.order.findFirst({
            where: { id, userId },
            include: {
                client: true,
                orderItems: { include: { service: { select: { name: true } } } },
                recurringParent: { select: { numberOrder: true } },
            },
        }).then((order) => {
            if (!order) return null;
            const { orderItems, ...rest } = order;
            return { ...rest, items: orderItems } as any;
        });
    },

    findByNumber(userId, numberOrder) {
        return prisma.order.findUnique({
            where: { userId_numberOrder: { userId, numberOrder } },
            include: {
                client: true,
                orderItems: { include: { service: { select: { name: true } } } },
            },
        }).then((order) => {
            if (!order || order.deletedAt) return null;
            const { orderItems, ...rest } = order;
            return { ...rest, items: orderItems } as any;
        });
    },

    findByDateRange(userId, start, end, status) {
        return prisma.order.findMany({
            where: {
                userId,
                deletedAt: null,
                createdAt: { gte: start, lte: end },
                ...(status ? { statusOrder: status } : {}),
            },
            orderBy: { createdAt: "desc" },
        });
    },

    findCashReceivedByDateRange(userId, start, end, status) {
        if (status && status !== "COMPLETED") return Promise.resolve([]);
        return prisma.order.findMany({
            where: {
                userId,
                deletedAt: null,
                statusOrder: "COMPLETED",
                paymentStatus: { in: ["PAID", "PARTIAL"] },
                lastPaymentAt: { gte: start, lte: end },
            },
            orderBy: { lastPaymentAt: "desc" },
        });
    },

    findByDeliveryDateRange(userId, start, end) {
        return prisma.order.findMany({
            where: {
                userId,
                deletedAt: null,
                deliveryDate: { gte: start, lte: end },
            },
            orderBy: { deliveryDate: "asc" },
        });
    },

    findPaidByDeliveryDateRange(userId, start, end, status) {
        if (status && status !== "COMPLETED") return Promise.resolve([]);
        return prisma.order.findMany({
            where: {
                userId,
                deletedAt: null,
                statusOrder: "COMPLETED",
                paymentStatus: "PAID",
                deliveryDate: { gte: start, lte: end },
            },
            orderBy: { deliveryDate: "desc" },
        });
    },

    findItemsByDateRange(userId, start, end, status) {
        return prisma.orderItem.findMany({
            where: {
                userId,
                order: {
                    createdAt: { gte: start, lte: end },
                    deletedAt: null,
                    ...(status ? { statusOrder: status } : {}),
                },
            },
            include: { service: { select: { name: true } } },
        });
    },

    async getDashboardCounts(userId): Promise<DashboardCounts> {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const [todayOrders, todayPaid] = await prisma.$transaction([
            prisma.order.findMany({
                where: { userId, createdAt: { gte: todayStart, lt: todayEnd }, deletedAt: null },
                select: { id: true, numberOrder: true, totalSale: true, statusOrder: true, clientId: true },
                orderBy: { createdAt: "desc" },
            }),
            prisma.order.findMany({
                where: {
                    userId,
                    statusOrder: "COMPLETED",
                    paymentStatus: { in: ["PAID", "PARTIAL"] },
                    lastPaymentAt: { gte: todayStart, lt: todayEnd },
                    deletedAt: null,
                },
                select: { id: true, totalSale: true, totalCost: true, amountPaid: true, paymentStatus: true },
            }),
        ]);

        return {
            todayCount: todayOrders.length,
            todayOrders,
            todayPaid,
        };
    },

    async createWithItems(userId, data: CreateOrderInput) {
        return prisma.$transaction(async (tx) => {
            const [{ orderSequence }] = await tx.$queryRaw<{ orderSequence: bigint }[]>`
                UPDATE "user" SET "orderSequence" = "orderSequence" + 1
                WHERE id = ${userId}
                RETURNING "orderSequence"
            `;

            const deliveryDate = data.deliveryDate ? new Date(data.deliveryDate) : null;
            const recurWeekly = data.recurWeekly ?? false;
            const recurMonthly = data.recurMonthly ?? false;
            // A primeira ocorrência é a própria OS sendo criada agora; a próxima gerada
            // automaticamente pelo job (ver recurring-orders.job.ts) começa daqui pra frente.
            const nextOccurrenceAt =
                (recurWeekly || recurMonthly) && deliveryDate
                    ? nextOrderOccurrence(deliveryDate, deliveryDate, recurWeekly, recurMonthly)
                    : null;

            const order = await tx.order.create({
                data: {
                    userId,
                    clientId: data.clientId,
                    numberOrder: orderSequence,
                    patientName: data.patientName ?? null,
                    notes: data.notes ?? null,
                    paymentMethod: data.paymentMethod ?? null,
                    deliveryDate,
                    paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
                    totalCost: data.totalCost,
                    totalSale: data.totalSale,
                    createdBy: userId,
                    recurWeekly,
                    recurMonthly,
                    nextOccurrenceAt,
                },
            });

            await tx.orderItem.createMany({
                data: data.items.map((item) => ({
                    orderId: order.id,
                    serviceId: item.serviceId,
                    userId,
                    costPrice: item.costPrice,
                    salePrice: item.salePrice,
                    discount: item.discount ?? 0,
                    increase: item.increase ?? 0,
                    quantity: item.quantity ?? 1,
                    finalPrice: item.finalPrice,
                })),
            });

            return order;
        });
    },

    async updateItems(id, userId, data: UpdateOrderItemsInput) {
        return prisma.$transaction(async (tx) => {
            await tx.orderItem.deleteMany({ where: { orderId: id, userId } });

            await tx.orderItem.createMany({
                data: data.items.map((item) => ({
                    orderId: id,
                    serviceId: item.serviceId,
                    userId,
                    costPrice: item.costPrice,
                    salePrice: item.salePrice,
                    discount: item.discount ?? 0,
                    increase: item.increase ?? 0,
                    quantity: item.quantity ?? 1,
                    finalPrice: item.finalPrice,
                })),
            });

            return tx.order.update({
                where: { id, userId },
                data: { totalCost: data.totalCost, totalSale: data.totalSale },
            });
        });
    },

    updateStatus(id, userId, data) {
        return prisma.order.update({
            where: { id, userId },
            data: {
                statusOrder: data.statusOrder as OrderStatus,
                completedAt: data.completedAt,
                canceledAt: data.canceledAt,
                cancelReason: data.cancelReason,
            },
        });
    },

    updatePaymentStatus(id, userId, data: UpdatePaymentInput) {
        return prisma.order.update({
            where: { id, userId },
            data: { paymentStatus: data.paymentStatus, amountPaid: data.amountPaid, lastPaymentAt: new Date() },
        });
    },

    updateDeliveryDate(id, userId, deliveryDate) {
        return prisma.order.update({
            where: { id, userId },
            data: { deliveryDate },
        });
    },

    stopRecurrence(id, userId) {
        return prisma.order.update({
            where: { id, userId },
            data: { recurWeekly: false, recurMonthly: false, nextOccurrenceAt: null },
        });
    },

    async softDelete(id, userId) {
        await prisma.order.update({
            where: { id, userId },
            data: { deletedAt: new Date() },
        });
    },
};
