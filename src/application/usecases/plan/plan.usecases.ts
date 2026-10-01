import type { PlanRepository } from "../../../domain/repository/plan.repository";
import type { UserRepository } from "../../../domain/repository/user.repository";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { downgradeBlockers, startOfMonthBRT } from "../../../domain/plan";
import { changePlanSchema, createPlanSchema, updatePlanSchema } from "../../../domain/validation/plan.schema";
import { recordAuditLog } from "../audit/record-audit-log.usecase";

// Planos disponíveis para contratação (landing page, cadastro e troca de plano).
export function listActivePlansUsecase(planRepo: PlanRepository) {
    return planRepo.listActive();
}

// Plano atual do usuário logado + quanto ele já usa de cada limite.
export async function getMyPlanUsecase(planRepo: PlanRepository, userRepo: UserRepository, userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new Error("Usuário não encontrado.");
    const [plan, usage] = await Promise.all([
        planRepo.findBySlug(user.plan),
        planRepo.usage(userId, startOfMonthBRT()),
    ]);
    return { plan, usage };
}

// Troca de plano (pelo próprio usuário ou pelo admin). Subir é sempre permitido; para
// descer, os clientes e serviços já cadastrados precisam caber no novo plano.
async function changePlan(
    planRepo: PlanRepository,
    userRepo: UserRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    input: unknown,
    changedBy: "user" | "admin",
) {
    const { plan: slug } = changePlanSchema.parse(input);
    const user = await userRepo.findById(userId);
    if (!user) throw new Error("Usuário não encontrado.");

    const target = await planRepo.findBySlug(slug);
    if (!target || !target.active) throw new Error("Plano não encontrado.");
    if (target.slug === user.plan) return user;

    const blockers = downgradeBlockers(target, await planRepo.usage(userId, startOfMonthBRT()));
    if (blockers.length) {
        throw new Error(
            `Não é possível mudar para o plano ${target.name}: ${blockers.join(" e ")}. ` +
                "Remova o excedente antes de trocar de plano.",
        );
    }

    const updated = await userRepo.setPlan(userId, target.slug);
    await recordAuditLog(auditRepo, {
        userId,
        about:
            changedBy === "admin"
                ? `Plano alterado pelo administrador para ${target.name}`
                : `Plano alterado para ${target.name}`,
        type: "UPDATE",
        metadata: { from: user.plan, to: target.slug },
    });
    return updated;
}

export function changeMyPlanUsecase(
    planRepo: PlanRepository,
    userRepo: UserRepository,
    auditRepo: AuditLogRepository,
    userId: string,
    input: unknown,
) {
    return changePlan(planRepo, userRepo, auditRepo, userId, input, "user");
}

// O admin só altera o plano de quem já confirmou a contratação paga (após o mês gratuito).
export async function adminSetUserPlanUsecase(
    planRepo: PlanRepository,
    userRepo: UserRepository,
    auditRepo: AuditLogRepository,
    targetUserId: string,
    input: unknown,
) {
    const user = await userRepo.findById(targetUserId);
    if (!user) throw new Error("Usuário não encontrado.");
    if (!user.contractAccepted) {
        throw new Error(
            "O plano só pode ser alterado pelo administrador depois que o usuário confirmar a contratação, ao fim dos 30 dias gratuitos.",
        );
    }
    return changePlan(planRepo, userRepo, auditRepo, targetUserId, input, "admin");
}

// ----- Gestão de planos (painel admin) -----

export function listAllPlansUsecase(planRepo: PlanRepository) {
    return planRepo.listAll();
}

export async function createPlanUsecase(planRepo: PlanRepository, input: unknown) {
    const data = createPlanSchema.parse(input);
    if (await planRepo.findBySlug(data.slug)) {
        throw new Error("Já existe um plano com esse identificador.");
    }
    return planRepo.create(data);
}

export function updatePlanUsecase(planRepo: PlanRepository, planId: string, input: unknown) {
    const data = updatePlanSchema.parse(input);
    return planRepo.update(planId, data);
}
