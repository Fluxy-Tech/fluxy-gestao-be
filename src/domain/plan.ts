// Regras de plano de assinatura (limites de uso). Limite null = sem limite.

export interface PlanLimits {
    maxClients: number | null;
    maxServices: number | null;
    maxOrdersPerMonth: number | null;
}

export interface PlanUsage {
    clients: number;
    services: number;
    ordersThisMonth: number;
}

// Início do mês corrente no horário de Brasília (UTC-3, sem horário de verão desde 2019),
// independente do fuso do servidor — o limite de OS é "por mês" na visão do usuário.
export function startOfMonthBRT(now = new Date()): Date {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
    }).formatToParts(now);
    const year = Number(parts.find((p) => p.type === "year")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    return new Date(Date.UTC(year, month - 1, 1, 3, 0, 0));
}

export function withinLimit(limit: number | null, current: number): boolean {
    return limit == null || current < limit;
}

// Para trocar para um plano menor, o que o usuário já tem cadastrado de clientes e
// serviços precisa caber nos limites do novo plano. O limite de OS é mensal e não impede
// a troca (só passa a valer para as próximas OS do mês).
export function downgradeBlockers(target: PlanLimits, usage: PlanUsage): string[] {
    const blockers: string[] = [];
    if (target.maxClients != null && usage.clients > target.maxClients) {
        blockers.push(
            `você tem ${usage.clients} clientes cadastrados e o plano permite ${target.maxClients}`,
        );
    }
    if (target.maxServices != null && usage.services > target.maxServices) {
        blockers.push(
            `você tem ${usage.services} serviços cadastrados e o plano permite ${target.maxServices}`,
        );
    }
    return blockers;
}
