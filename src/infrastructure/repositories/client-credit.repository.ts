import { prisma } from "../database/prisma";
import type {
    ClientCreditRepository,
    ClientCreditStatement,
    ManualCreditInput,
} from "../../domain/repository/client-credit.repository";
import { applyCreditMovement } from "./client-credit";

async function getStatement(clientId: string, userId: string): Promise<ClientCreditStatement | null> {
    const client = await prisma.client.findFirst({
        where: { id: clientId, userId },
        select: { id: true, name: true, creditBalance: true },
    });
    if (!client) return null;
    const movements = await prisma.clientCreditMovement.findMany({
        where: { clientId, userId },
        include: {
            order: { select: { numberOrder: true } },
            serviceInvoice: { select: { number: true } },
        },
        orderBy: { occurredAt: "desc" },
    });
    return { clientId: client.id, clientName: client.name, balance: Number(client.creditBalance), movements };
}

export const clientCreditRepository: ClientCreditRepository = {
    getStatement,

    async addManual(clientId, userId, data: ManualCreditInput) {
        await prisma.$transaction((tx) =>
            applyCreditMovement(tx, {
                userId,
                clientId,
                type: data.type,
                origin: "MANUAL",
                amount: data.amount,
                description: data.description,
                affectsCash: data.affectsCash,
            }),
        );
        return (await getStatement(clientId, userId))!;
    },
};
