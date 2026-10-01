import type { PlanRepository } from "../../../domain/repository/plan.repository";
import type { UserRepository } from "../../../domain/repository/user.repository";
import { startOfMonthBRT, withinLimit } from "../../../domain/plan";

export type LimitedResource = "clients" | "services" | "orders";

// Barra a criação de cliente/serviço/OS quando o plano do usuário já atingiu o limite.
// Admins não têm limite. Chamado pelos usecases de criação antes de gravar.
export async function assertPlanLimit(
    planRepo: PlanRepository,
    userRepo: UserRepository,
    userId: string,
    resource: LimitedResource,
) {
    const user = await userRepo.findById(userId);
    if (!user) throw new Error("Usuário não encontrado.");
    if (user.role === "admin") return;

    const plan = await planRepo.findBySlug(user.plan);
    if (!plan) return;

    const usage = await planRepo.usage(userId, startOfMonthBRT());
    const upgrade = "Mude para um plano maior em Perfil para continuar.";

    if (resource === "clients" && !withinLimit(plan.maxClients, usage.clients)) {
        throw new Error(`Seu plano ${plan.name} permite até ${plan.maxClients} clientes. ${upgrade}`);
    }
    if (resource === "services" && !withinLimit(plan.maxServices, usage.services)) {
        throw new Error(`Seu plano ${plan.name} permite até ${plan.maxServices} serviços. ${upgrade}`);
    }
    if (resource === "orders" && !withinLimit(plan.maxOrdersPerMonth, usage.ordersThisMonth)) {
        throw new Error(
            `Seu plano ${plan.name} permite até ${plan.maxOrdersPerMonth} OS por mês. ${upgrade}`,
        );
    }
}
