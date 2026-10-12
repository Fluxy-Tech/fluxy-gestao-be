import type { Prisma } from "../../../generated/prisma/client";

// Operações no saldo (crédito) do cliente, sempre dentro da transação de quem as chama
// (pagamento de OS/nota, lançamento manual): o saldo em Client.creditBalance e o extrato
// em ClientCreditMovement mudam juntos ou não mudam.

type Tx = Prisma.TransactionClient;

export interface CreditMovementInput {
    userId: string;
    clientId: string;
    type: "IN" | "OUT";
    origin: "OVERPAYMENT" | "MANUAL" | "PAYMENT" | "PAYMENT_REVERSAL";
    amount: number;
    description?: string | null;
    orderId?: string | null;
    serviceInvoiceId?: string | null;
    affectsCash?: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function applyCreditMovement(tx: Tx, input: CreditMovementInput) {
    const amount = round2(input.amount);
    if (amount <= 0) return;

    if (input.type === "OUT") {
        // Débito condicional: falha se o saldo atual não cobre o valor, mesmo com dois
        // pagamentos concorrentes usando o mesmo saldo.
        const { count } = await tx.client.updateMany({
            where: { id: input.clientId, userId: input.userId, creditBalance: { gte: amount } },
            data: { creditBalance: { decrement: amount } },
        });
        if (count === 0) throw new Error("O cliente não tem saldo suficiente para este valor.");
    } else {
        await tx.client.update({
            where: { id: input.clientId, userId: input.userId },
            data: { creditBalance: { increment: amount } },
        });
    }

    await tx.clientCreditMovement.create({
        data: {
            userId: input.userId,
            clientId: input.clientId,
            type: input.type,
            origin: input.origin,
            amount,
            description: input.description ?? null,
            orderId: input.orderId ?? null,
            serviceInvoiceId: input.serviceInvoiceId ?? null,
            affectsCash: input.affectsCash ?? false,
        },
    });
}

// Calcula o novo creditUsed de uma OS/nota num pagamento e lança no extrato: `useCredit`
// é o saldo adicional usado agora (sai do saldo); se o valor pago diminuiu e ficou abaixo
// do saldo já usado (ex.: pagamento voltou a pendente), a diferença volta para o cliente.
export async function settleCreditUsage(
    tx: Tx,
    params: {
        userId: string;
        clientId: string;
        currentCreditUsed: number;
        useCredit: number;
        amountPaid: number;
        label: string;
        orderId?: string;
        serviceInvoiceId?: string;
    },
): Promise<number> {
    const useCredit = round2(params.useCredit);
    const target = round2(params.currentCreditUsed + useCredit);
    if (useCredit > 0 && target > round2(params.amountPaid)) {
        throw new Error("O saldo usado não pode ser maior que o valor pago.");
    }
    const creditUsed = Math.min(target, round2(params.amountPaid));
    const refs = { orderId: params.orderId, serviceInvoiceId: params.serviceInvoiceId };

    if (useCredit > 0) {
        await applyCreditMovement(tx, {
            userId: params.userId,
            clientId: params.clientId,
            type: "OUT",
            origin: "PAYMENT",
            amount: useCredit,
            description: `Usado no pagamento da ${params.label}`,
            ...refs,
        });
    }
    const reversal = round2(target - creditUsed);
    if (reversal > 0) {
        await applyCreditMovement(tx, {
            userId: params.userId,
            clientId: params.clientId,
            type: "IN",
            origin: "PAYMENT_REVERSAL",
            amount: reversal,
            description: `Devolvido do pagamento da ${params.label}`,
            ...refs,
        });
    }
    return creditUsed;
}

// Valor recebido acima do total: vira saldo do cliente e entra no caixa (affectsCash).
export async function addOverpaymentCredit(
    tx: Tx,
    params: {
        userId: string;
        clientId: string;
        amount: number;
        label: string;
        orderId?: string;
        serviceInvoiceId?: string;
    },
) {
    await applyCreditMovement(tx, {
        userId: params.userId,
        clientId: params.clientId,
        type: "IN",
        origin: "OVERPAYMENT",
        amount: params.amount,
        description: `Excedente do pagamento da ${params.label}`,
        orderId: params.orderId,
        serviceInvoiceId: params.serviceInvoiceId,
        affectsCash: true,
    });
}
