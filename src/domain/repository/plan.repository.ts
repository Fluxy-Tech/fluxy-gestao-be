import type { Plan } from "../../../generated/prisma/client";
import type { PlanUsage } from "../plan";

export interface PlanInput {
    name: string;
    price: number;
    maxClients: number | null;
    maxServices: number | null;
    maxOrdersPerMonth: number | null;
    description: string | null;
    active: boolean;
    sortOrder: number;
}

export interface PlanRepository {
    listActive(): Promise<Plan[]>;
    listAll(): Promise<Plan[]>;
    findBySlug(slug: string): Promise<Plan | null>;
    create(data: PlanInput & { slug: string }): Promise<Plan>;
    update(id: string, data: Partial<PlanInput>): Promise<Plan>;
    // Clientes e serviços ativos (sem exclusão lógica) e OS criadas desde monthStart.
    usage(userId: string, monthStart: Date): Promise<PlanUsage>;
}
