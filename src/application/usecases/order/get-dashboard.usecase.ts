import type { OrderRepository } from "../../../domain/repository/order.repository";
import type { ClientRepository } from "../../../domain/repository/client.repository";
import { cached, cacheKey, invalidate } from "../../../infrastructure/cache/cache";
import { cashCost, cashRevenue } from "../../../domain/order-cash";

export function getDashboardUsecase(orderRepo: OrderRepository, clientRepo: ClientRepository, userId: string) {
    return cached(cacheKey("dashboard", userId), 30, () => computeDashboard(orderRepo, clientRepo, userId));
}

export function invalidateDashboardCache(userId: string) {
    return invalidate(cacheKey("dashboard", userId));
}

async function computeDashboard(orderRepo: OrderRepository, clientRepo: ClientRepository, userId: string) {
    const counts = await orderRepo.getDashboardCounts(userId);
    const clients = await clientRepo.findAllByUser(userId);
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    // Faturamento/custo do dia: dinheiro que realmente entrou hoje — OS pagas
    // integralmente contam o valor cheio, OS com pagamento parcial contam o valor já
    // recebido (custo estimado em 60% desse valor parcial) — mesma regra de Relatórios.
    const revenue = counts.todayPaid.reduce((s, o) => s + cashRevenue(o), 0);
    const cost = counts.todayPaid.reduce((s, o) => s + cashCost(o), 0);

    const today = counts.todayOrders.map((o) => ({ ...o, clientName: clientMap.get(o.clientId) ?? "—" }));

    // Faturamento de cada dia da semana corrente (segunda a domingo), mesma regra acima.
    const weekRevenue = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(counts.weekStart.getFullYear(), counts.weekStart.getMonth(), counts.weekStart.getDate() + i);
        const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
        const revenue = counts.weekPaid
            .filter((o) => o.lastPaymentAt && o.lastPaymentAt >= day && o.lastPaymentAt < next)
            .reduce((s, o) => s + cashRevenue(o), 0);
        return { date: day.toISOString(), revenue };
    });

    return {
        todayCount: counts.todayCount,
        yesterdayCount: counts.yesterdayCount,
        weekRevenue,
        revenue,
        cost,
        margin: revenue - cost,
        today,
    };
}
