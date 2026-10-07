import { prisma } from "../database/prisma";
import type { Prisma } from "../../../generated/prisma/client";
import type {
    CreateServiceInvoiceInput,
    ListServiceInvoiceFilters,
    ServiceInvoiceRepository,
} from "../../domain/repository/service-invoice.repository";

const includeClientAndOrders = {
    client: { select: { name: true } },
    orders: { select: { id: true, numberOrder: true } },
} as const;

// Distribui o valor pago da nota entre as OS vinculadas, da mais antiga para a mais nova:
// cada OS recebe até o seu total antes de passar para a próxima. Assim o pagamento parcial
// da nota chega ao caixa (que soma o amountPaid das OS — ver reconcileUserCash).
async function distributeInvoicePayment(tx: Prisma.TransactionClient, invoiceId: string, amountPaid: number) {
    const orders = await tx.order.findMany({
        where: { serviceInvoiceId: invoiceId },
        select: { id: true, totalSale: true },
        orderBy: { numberOrder: "asc" },
    });

    const now = new Date();
    let remaining = amountPaid;
    for (const order of orders) {
        const total = Number(order.totalSale);
        const paid = Math.min(remaining, total);
        remaining = Math.max(0, remaining - paid);
        const paymentStatus = paid <= 0 ? "PENDING" : paid >= total ? "PAID" : "PARTIAL";
        await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus, amountPaid: paid, lastPaymentAt: now },
        });
    }
}

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
                select: {
                    id: true,
                    totalSale: true,
                    serviceInvoiceId: true,
                    serviceInvoice: { select: { status: true } },
                },
            });

            if (orders.length !== data.orderIds.length) {
                throw new Error("Uma ou mais OS selecionadas não pertencem a este cliente.");
            }
            // Uma OS só pode entrar numa nota nova se não estiver em nenhuma, ou se a nota
            // atual dela já estiver CANCELED/SETTLED (ver comentário em Order.serviceInvoiceId).
            if (orders.some((o) => o.serviceInvoiceId && o.serviceInvoice?.status === "ISSUED")) {
                throw new Error("Uma ou mais OS selecionadas já estão vinculadas a outra nota em aberto.");
            }

            // Numeração única da empresa, independente do cliente (igual às OS).
            const [{ invoiceSequence }] = await tx.$queryRaw<{ invoiceSequence: bigint }[]>`
                UPDATE "user" SET "invoiceSequence" = "invoiceSequence" + 1
                WHERE id = ${userId}
                RETURNING "invoiceSequence"
            `;

            const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalSale), 0);

            const invoice = await tx.serviceInvoice.create({
                data: {
                    ...(data.id ? { id: data.id } : {}),
                    userId,
                    clientId: data.clientId,
                    number: invoiceSequence,
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

    cancel(id, userId, cancelReason) {
        // O vínculo das OS é preservado (ver comentário em Order.serviceInvoiceId) — elas só
        // ficam disponíveis para outra nota por já apontarem pra uma nota CANCELED/SETTLED.
        return prisma.serviceInvoice.update({
            where: { id, userId },
            data: { status: "CANCELED", canceledAt: new Date(), cancelReason: cancelReason ?? null },
            include: includeClientAndOrders,
        });
    },

    reopen(id, userId) {
        return prisma.serviceInvoice.update({
            where: { id, userId },
            data: { status: "ISSUED", canceledAt: null, cancelReason: null },
            include: includeClientAndOrders,
        });
    },

    async updateOrders(id, userId, orderIds) {
        return prisma.$transaction(async (tx) => {
            const invoice = await tx.serviceInvoice.findFirst({ where: { id, userId } });
            if (!invoice) throw new Error("Nota fiscal não encontrada.");
            if (invoice.status !== "ISSUED") {
                throw new Error("Só é possível alterar as OS de uma nota emitida.");
            }

            const currentOrders = await tx.order.findMany({
                where: { serviceInvoiceId: id },
                select: { id: true },
            });
            const currentIds = new Set(currentOrders.map((o) => o.id));
            const nextIds = new Set(orderIds);

            const toRemove = [...currentIds].filter((oid) => !nextIds.has(oid));
            const toAdd = [...nextIds].filter((oid) => !currentIds.has(oid));

            if (toAdd.length > 0) {
                const candidates = await tx.order.findMany({
                    where: { id: { in: toAdd }, userId, clientId: invoice.clientId, deletedAt: null },
                    select: {
                        id: true,
                        serviceInvoiceId: true,
                        serviceInvoice: { select: { status: true } },
                    },
                });
                if (candidates.length !== toAdd.length) {
                    throw new Error("Uma ou mais OS selecionadas não pertencem a este cliente.");
                }
                if (
                    candidates.some(
                        (o) => o.serviceInvoiceId && o.serviceInvoiceId !== id && o.serviceInvoice?.status === "ISSUED",
                    )
                ) {
                    throw new Error("Uma ou mais OS selecionadas já estão vinculadas a outra nota em aberto.");
                }
            }

            if (toRemove.length > 0) {
                await tx.order.updateMany({
                    where: { id: { in: toRemove }, serviceInvoiceId: id },
                    data: { serviceInvoiceId: null },
                });
            }
            if (toAdd.length > 0) {
                await tx.order.updateMany({
                    where: { id: { in: toAdd } },
                    data: { serviceInvoiceId: id },
                });
            }

            const linkedOrders = await tx.order.findMany({
                where: { serviceInvoiceId: id },
                select: { totalSale: true },
            });
            const totalAmount = linkedOrders.reduce((sum, o) => sum + Number(o.totalSale), 0);

            // Com pagamento parcial, o valor já recebido é redistribuído entre as OS que
            // ficaram na nota — e precisa continuar menor que o novo total.
            if (invoice.paymentStatus === "PARTIAL") {
                if (Number(invoice.amountPaid) >= totalAmount) {
                    throw new Error("O valor já pago da nota é maior ou igual ao novo total. Ajuste o pagamento antes.");
                }
                await distributeInvoicePayment(tx, id, Number(invoice.amountPaid));
            }

            return tx.serviceInvoice.update({
                where: { id },
                data: { totalAmount },
                include: includeClientAndOrders,
            });
        });
    },

    settle(id, userId) {
        return serviceInvoiceRepository.updatePayment(id, userId, { paymentStatus: "PAID", amountPaid: 0 });
    },

    // PAID quita a nota inteira (vira SETTLED, como "dar baixa"); PARTIAL/PENDING mantêm a
    // nota em aberto (ISSUED) com o valor já recebido.
    async updatePayment(id, userId, data) {
        return prisma.$transaction(async (tx) => {
            const current = await tx.serviceInvoice.findFirstOrThrow({ where: { id, userId } });
            const amountPaid = data.paymentStatus === "PAID" ? Number(current.totalAmount) : data.amountPaid;

            const invoice = await tx.serviceInvoice.update({
                where: { id, userId },
                data: {
                    paymentStatus: data.paymentStatus,
                    amountPaid,
                    ...(data.paymentStatus === "PAID" ? { status: "SETTLED", settledAt: new Date() } : {}),
                },
                include: includeClientAndOrders,
            });

            // Quitada: toda OS vinculada fica paga pelo próprio total, mesmo que algum total
            // tenha mudado depois da emissão.
            await distributeInvoicePayment(tx, id, data.paymentStatus === "PAID" ? Infinity : amountPaid);
            return invoice;
        });
    },
};
