import cron from "node-cron";
import { prisma } from "../database/prisma";
import { addMonths } from "../../domain/expense-occurrences";
import { cashRevenue } from "../../domain/order-cash";
import type { Expense } from "../../../generated/prisma/client";

// Ocorrências (para recorrentes) ou o lançamento único desta despesa que ainda não
// foram somados ao currentCash — usa o watermark próprio da despesa (cashCountedUntil),
// nunca uma janela de dia compartilhada (ver comentário em reconcileUserCash abaixo).
function pendingExpenseOccurrences(e: Expense, now: Date): Date[] {
    const watermark = e.cashCountedUntil ?? new Date(0);
    if (!e.isRecurring) {
        return e.date > watermark && e.date <= now ? [e.date] : [];
    }
    const rangeEnd = e.recurrenceEndDate && e.recurrenceEndDate < now ? e.recurrenceEndDate : now;
    const dates: Date[] = [];
    let cursor = new Date(e.date);
    while (cursor <= watermark) cursor = addMonths(cursor, 1);
    while (cursor <= rangeEnd) {
        dates.push(new Date(cursor));
        cursor = addMonths(cursor, 1);
    }
    return dates;
}

// Soma ao caixa o faturamento das OS finalizadas (concluídas, com pagamento total ou
// parcial — neste caso só entra o valor efetivamente pago, nunca o total da OS) e
// subtrai a saída de caixa das despesas pagas (status PAID; pendentes não afetam o
// caixa real ainda).
//
// Saldo de cliente: a parte de uma OS paga com saldo (creditUsed) não entra de novo — esse
// dinheiro já entrou quando o crédito foi recebido, pela movimentação de saldo com
// affectsCash (excedente de pagamento ou lançamento manual), que é contada uma única vez
// e marcada com cashCounted.
//
// Nem o lado das OS nem o das despesas usa uma janela de tempo compartilhada: cada OS
// guarda quanto do seu valor em caixa (cashRevenue) já foi somado ao currentCash, em
// `cashCountedAmount`, e cada despesa guarda até que instante suas ocorrências pagas já
// foram somadas, em `cashCountedUntil`. A cada rodada soma-se só a diferença entre o
// valor atual e o que já foi contado — assim um pagamento ou uma despesa lançados com
// atraso nunca ficam presos atrás de um checkpoint que já passou, e o botão "Atualizar
// Caixa atual" pode ser clicado quantas vezes quiser, no mesmo dia, sem contar nada em
// duplicidade nem perder nada.
async function reconcileUserCash(
    userId: string,
    currentCash: number,
): Promise<{ currentCash: number; skipped: boolean }> {
    const now = new Date();

    const [cashOrders, paidExpenses, creditMovements] = await Promise.all([
        prisma.order.findMany({
            where: {
                userId,
                statusOrder: "COMPLETED",
                paymentStatus: { in: ["PAID", "PARTIAL"] },
                deletedAt: null,
            },
            select: {
                id: true, numberOrder: true, totalSale: true, totalCost: true, amountPaid: true,
                paymentStatus: true, cashCountedAmount: true, lastPaymentAt: true, creditUsed: true,
            },
        }),
        prisma.expense.findMany({
            where: { userId, deletedAt: null, status: "PAID" },
        }),
        prisma.clientCreditMovement.findMany({
            where: { userId, affectsCash: true, cashCounted: false },
            select: {
                id: true, type: true, amount: true, description: true, occurredAt: true,
                client: { select: { name: true } },
            },
        }),
    ]);

    const pendingDeltas = cashOrders
        .map((o) => ({
            id: o.id,
            delta: cashRevenue(o) - Number(o.creditUsed) - Number(o.cashCountedAmount),
            numberOrder: o.numberOrder,
            paymentStatus: o.paymentStatus,
            occurredAt: o.lastPaymentAt ?? now,
        }))
        .filter((o) => o.delta > 0);
    const revenue = pendingDeltas.reduce((s, o) => s + o.delta, 0);

    const creditEntries = creditMovements.map((m) => ({
        id: m.id,
        type: m.type,
        amount: Number(m.amount),
        description: `Saldo de ${m.client.name}${m.description ? ` — ${m.description}` : ""}`,
        occurredAt: m.occurredAt,
    }));
    const creditNet = creditEntries.reduce((s, m) => s + (m.type === "IN" ? m.amount : -m.amount), 0);

    const outflowEntries: { description: string; amount: number; occurredAt: Date }[] = [];
    const expenseWatermarks: { id: string; countedUntil: Date }[] = [];
    for (const e of paidExpenses) {
        const occurrences = pendingExpenseOccurrences(e, now);
        if (occurrences.length === 0) continue;
        for (const date of occurrences) {
            outflowEntries.push({ description: e.description, amount: Number(e.amount), occurredAt: date });
        }
        expenseWatermarks.push({ id: e.id, countedUntil: now });
    }
    const outflow = outflowEntries.reduce((s, e) => s + e.amount, 0);

    if (revenue === 0 && outflow === 0 && creditEntries.length === 0) {
        return { currentCash, skipped: true };
    }

    const newCash = currentCash + revenue - outflow + creditNet;
    await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { currentCash: newCash, cashReconciledAt: now } }),
        ...pendingDeltas.map((o) =>
            prisma.order.update({ where: { id: o.id }, data: { cashCountedAmount: { increment: o.delta } } }),
        ),
        ...expenseWatermarks.map((e) =>
            prisma.expense.update({ where: { id: e.id }, data: { cashCountedUntil: e.countedUntil } }),
        ),
        prisma.clientCreditMovement.updateMany({
            where: { id: { in: creditEntries.map((m) => m.id) } },
            data: { cashCounted: true },
        }),
        prisma.cashMovement.createMany({
            data: [
                ...pendingDeltas.map((o) => ({
                    userId,
                    type: "IN" as const,
                    amount: o.delta,
                    description: `OS #${o.numberOrder} — ${o.paymentStatus === "PAID" ? "pagamento total" : "pagamento parcial"}`,
                    occurredAt: o.occurredAt,
                })),
                ...outflowEntries.map((e) => ({
                    userId,
                    type: "OUT" as const,
                    amount: e.amount,
                    description: `Despesa: ${e.description}`,
                    occurredAt: e.occurredAt,
                })),
                ...creditEntries.map((m) => ({
                    userId,
                    type: m.type,
                    amount: m.amount,
                    description: m.description,
                    occurredAt: m.occurredAt,
                })),
            ],
        }),
    ]);
    return { currentCash: newCash, skipped: false };
}

// Roda toda meia-noite, para todos os usuários.
export async function runDailyCashReconciliation(): Promise<void> {
    const users = await prisma.user.findMany({ select: { id: true, currentCash: true } });

    for (const user of users) {
        try {
            await reconcileUserCash(user.id, Number(user.currentCash));
        } catch (err) {
            console.error(`[cash-reconciliation] falhou para o usuário ${user.id}:`, (err as Error).message);
        }
    }

    console.log(`[cash-reconciliation] ${users.length} usuário(s) processado(s) em ${new Date().toISOString()}`);
}

// Disparado manualmente (botão "Atualizar Caixa atual") e automaticamente após eventos
// que mudam o caixa: OS concluída/paga e despesa criada ou atualizada como paga.
export async function reconcileCashForUser(userId: string): Promise<{ currentCash: number; skipped: boolean }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentCash: true },
    });
    if (!user) throw new Error("Usuário não encontrado.");
    return reconcileUserCash(userId, Number(user.currentCash));
}

export function scheduleDailyCashReconciliation(): void {
    cron.schedule("0 0 * * *", () => {
        runDailyCashReconciliation().catch((err) => console.error("[cash-reconciliation] job falhou:", err));
    });
}
