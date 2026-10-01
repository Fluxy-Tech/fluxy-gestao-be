import { prisma } from "../database/prisma";
import type { PlanRepository } from "../../domain/repository/plan.repository";

const ORDER = [{ sortOrder: "asc" as const }, { price: "asc" as const }];

export const planRepository: PlanRepository = {
    listActive() {
        return prisma.plan.findMany({ where: { active: true }, orderBy: ORDER });
    },

    listAll() {
        return prisma.plan.findMany({ orderBy: ORDER });
    },

    findBySlug(slug) {
        return prisma.plan.findUnique({ where: { slug } });
    },

    create(data) {
        return prisma.plan.create({ data });
    },

    update(id, data) {
        return prisma.plan.update({ where: { id }, data });
    },

    async usage(userId, monthStart) {
        const [clients, services, ordersThisMonth] = await Promise.all([
            prisma.client.count({ where: { userId, deletedAt: null } }),
            prisma.service.count({ where: { userId, deletedAt: null } }),
            prisma.order.count({ where: { userId, deletedAt: null, createdAt: { gte: monthStart } } }),
        ]);
        return { clients, services, ordersThisMonth };
    },
};
