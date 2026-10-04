import type { OrderRepository } from "../../../domain/repository/order.repository";
import type { OrderStatus } from "../../../../generated/prisma/client";
import { cashCost, cashRevenue } from "../../../domain/order-cash";

export async function getReportUsecase(
    repo: OrderRepository,
    userId: string,
    start: string,
    end: string,
    status?: OrderStatus,
) {
    const startDate = new Date(`${start}T00:00:00`);
    const endDate = new Date(`${end}T23:59:59`);
    const [orders, items, cashReceived, paidByDelivery] = await Promise.all([
        repo.findByDateRange(userId, startDate, endDate, status),
        repo.findItemsByDateRange(userId, startDate, endDate, status),
        // Escopo próprio por lastPaymentAt (não createdAt) — uma OS aberta num mês e paga
        // no seguinte deve contar como faturamento do mês em que o dinheiro entrou.
        repo.findCashReceivedByDateRange(userId, startDate, endDate, status),
        // Escopo por deliveryDate, usado só pelo gráfico "Faturamento no período" (ver abaixo).
        repo.findPaidByDeliveryDateRange(userId, startDate, endDate, status),
    ]);

    const pending = orders.filter((o) => o.statusOrder === "PENDING");
    const completed = orders.filter((o) => o.statusOrder === "COMPLETED");
    const canceled = orders.filter((o) => o.statusOrder === "CANCELED");
    // Concluídas mas ainda não pagas integralmente (a receber ou parcial) — mesma regra
    // da tela OS Receber, independente da forma de pagamento.
    const receivable = completed.filter((o) => o.paymentStatus !== "PAID");
    // Faturamento/custo/margem do relatório consideram somente OS pagas integralmente —
    // pagamento parcial não entra nesses totais (fica refletido só em "A receber").
    const paidCashReceived = cashReceived.filter((o) => o.paymentStatus === "PAID");
    const revenue = paidCashReceived.reduce((s, o) => s + cashRevenue(o), 0);
    const cost = paidCashReceived.reduce((s, o) => s + cashCost(o), 0);
    const receivableValue = receivable.reduce(
        (s, o) => s + Math.max(0, Number(o.totalSale) - Number(o.amountPaid)),
        0,
    );

    // Séries por dia para os gráficos do período (apenas OS pagas integralmente).
    // Faturamento usa a data de ENTREGA (deliveryDate) — o gráfico existe para mostrar em
    // quais dias o trabalho entregue gerou mais receita, não quando o dinheiro efetivamente
    // caiu. Custo de mão de obra continua por lastPaymentAt (quando o valor entrou em
    // caixa), que é o que importa para o fluxo de caixa.
    const revenueByDay = new Map<string, number>();
    const costByDay = new Map<string, number>();
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);
    const lastDay = new Date(endDate);
    lastDay.setHours(0, 0, 0, 0);
    while (cursor <= lastDay) {
        const key = cursor.toISOString().slice(0, 10);
        revenueByDay.set(key, 0);
        costByDay.set(key, 0);
        cursor.setDate(cursor.getDate() + 1);
    }
    for (const o of paidByDelivery) {
        if (!o.deliveryDate) continue;
        const key = new Date(o.deliveryDate).toISOString().slice(0, 10);
        if (revenueByDay.has(key)) revenueByDay.set(key, revenueByDay.get(key)! + Number(o.totalSale));
    }
    for (const o of paidCashReceived) {
        if (!o.lastPaymentAt) continue;
        const key = new Date(o.lastPaymentAt).toISOString().slice(0, 10);
        if (costByDay.has(key)) costByDay.set(key, costByDay.get(key)! + cashCost(o));
    }
    // "yyyy-MM-dd" -> "dd/MM" (formato brasileiro, dia antes do mês) para o eixo dos gráficos.
    const toBRLabel = (isoDate: string) => `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;
    const revenueSeries = Array.from(revenueByDay.entries()).map(([date, value]) => ({ date: toBRLabel(date), value }));
    const costSeries = Array.from(costByDay.entries()).map(([date, value]) => ({ date: toBRLabel(date), value }));

    // Status das OS no período (mesma categorização do antigo gráfico de pizza do dashboard).
    const nowCutoff = new Date();
    nowCutoff.setHours(0, 0, 0, 1);
    const statusCounts: Record<string, number> = { Concluídas: 0, Pendentes: 0, Atrasado: 0 };
    for (const o of orders) {
        if (o.statusOrder === "COMPLETED") {
            statusCounts["Concluídas"]++;
        } else if (o.statusOrder === "CANCELED") {
            continue;
        } else {
            const d = o.deliveryDate ? new Date(o.deliveryDate) : null;
            if (d && d < nowCutoff) statusCounts["Atrasado"]++;
            else statusCounts["Pendentes"]++;
        }
    }
    const statusSeries = Object.entries(statusCounts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }));

    // Top 5 serviços mais vendidos (por quantidade) no período.
    // Serviços extras (sem serviceId) são agrupados pelo nome digitado.
    const serviceStats = new Map<string, { serviceId: string | null; name: string; quantity: number; revenue: number }>();
    for (const it of items) {
        const name = it.service?.name ?? it.serviceName ?? "Serviço extra";
        const key = it.serviceId ?? `extra:${name.toLowerCase()}`;
        const cur = serviceStats.get(key) ?? { serviceId: it.serviceId, name, quantity: 0, revenue: 0 };
        cur.quantity += Number(it.quantity);
        cur.revenue += Number(it.finalPrice);
        serviceStats.set(key, cur);
    }
    const topServices = Array.from(serviceStats.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    return {
        orders,
        totals: {
            total: orders.length,
            pending: pending.length,
            completed: completed.length,
            canceled: canceled.length,
            revenue,
            cost,
            margin: revenue - cost,
            receivableValue,
        },
        revenueSeries,
        costSeries,
        statusSeries,
        topServices,
    };
}
