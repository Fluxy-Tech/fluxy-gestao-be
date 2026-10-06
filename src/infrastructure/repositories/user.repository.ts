import { prisma } from "../database/prisma";
import type { UserRepository } from "../../domain/repository/user.repository";

// Normaliza para DDD + 8 dígitos locais, removendo DDI (55) e o 9º dígito do celular
// quando presentes — ambos opcionais e inconsistentes entre as fontes: o telefone
// salvo no perfil (mascarado, sem DDI) costuma ter o 9, enquanto o wa_id que a Meta
// envia tem DDI e às vezes vem sem o 9 (número normalizado pela operadora/Meta).
function normalizePhone(phone: string): string {
    let digits = phone.replace(/\D/g, "");
    if (digits.length >= 12) {
        digits = digits.slice(-(digits.length - 2)); // remove o DDI (ex: 55)
    }
    if (digits.length === 11) {
        digits = digits.slice(0, 2) + digits.slice(3); // remove o 9º dígito do celular
    }
    return digits;
}

// Telefone é sempre gravado como somente dígitos + DDI 55 na frente (ver
// normalizePhoneForStorage) — a partir do alvo canônico (DDD + 8 dígitos)
// reconstrói as duas formas que podem estar no banco (com e sem o 9º dígito
// do celular) pra buscar por igualdade exata em vez de varrer a tabela.
function phoneStorageVariants(target: string): string[] {
    if (target.length !== 10) return [target];
    const ddd = target.slice(0, 2);
    const local = target.slice(2);
    return [`55${ddd}${local}`, `55${ddd}9${local}`];
}

export const userRepository: UserRepository = {
    findById(id) {
        return prisma.user.findUnique({ where: { id } });
    },

    findByPhone(phone) {
        const target = normalizePhone(phone);
        if (!target) return Promise.resolve(null);

        return prisma.user.findFirst({ where: { phone: { in: phoneStorageVariants(target) } } });
    },

    updateProfile(id, data) {
        return prisma.user.update({ where: { id }, data });
    },

    updateCompany(id, data) {
        // Ao redefinir o valor de caixa manualmente, o baseline da conciliação avança
        // para agora — evita somar de novo, sobre o novo valor, atividade anterior a
        // este ajuste manual.
        return prisma.user.update({
            where: { id },
            data: {
                ...data,
                ...(data.currentCash !== undefined ? { cashReconciledAt: new Date() } : {}),
            },
        });
    },

    updateBrand(id, data) {
        return prisma.user.update({ where: { id }, data });
    },

    count() {
        return prisma.user.count();
    },

    findBillableBeforeMonth(monthStart) {
        return prisma.user.findMany({
            where: {
                role: { not: "admin" },
                createdAt: { lt: monthStart },
                billingExempt: false,
                contractAccepted: true,
            },
        });
    },

    async setAsaasCustomerId(id, asaasCustomerId) {
        await prisma.user.update({ where: { id }, data: { asaasCustomerId } });
    },

    async setBillingBlocked(id, blocked) {
        await prisma.user.update({ where: { id }, data: { billingBlocked: blocked } });
    },

    setPlan(id, plan) {
        return prisma.user.update({ where: { id }, data: { plan } });
    },

    setDashboardView(id, dashboardView) {
        return prisma.user.update({ where: { id }, data: { dashboardView } });
    },

    setContractAcceptance(id, accepted) {
        return prisma.user.update({
            where: { id },
            data: { contractAccepted: accepted, contractAcceptedAt: accepted ? new Date() : null },
        });
    },

    async setBillingExempt(id, exempt) {
        await prisma.user.update({ where: { id }, data: { billingExempt: exempt } });
    },

    // O onDelete: Cascade a partir de `user` não basta: Order→Client, OrderItem→Service e
    // ServiceInvoice→Client são Restrict, e o Postgres recusa o delete se a cascata chegar
    // nos pais antes dos filhos. Por isso apaga explicitamente, dos filhos para os pais.
    async deleteWithAllData(id) {
        const user = await prisma.user.findUnique({ where: { id }, select: { email: true } });
        if (!user) return {};

        return prisma.$transaction(async (tx) => {
            const orderItems = await tx.orderItem.deleteMany({ where: { OR: [{ userId: id }, { order: { userId: id } }] } });
            const orders = await tx.order.deleteMany({ where: { userId: id } });
            const serviceInvoices = await tx.serviceInvoice.deleteMany({ where: { userId: id } });
            const services = await tx.service.deleteMany({ where: { userId: id } });
            const clients = await tx.client.deleteMany({ where: { userId: id } });
            const expenses = await tx.expense.deleteMany({ where: { userId: id } });
            const debts = await tx.debt.deleteMany({ where: { userId: id } });
            const cashMovements = await tx.cashMovement.deleteMany({ where: { userId: id } });
            const invoices = await tx.invoice.deleteMany({ where: { userId: id } });
            const auditLogs = await tx.auditLog.deleteMany({ where: { userId: id } });
            await tx.session.deleteMany({ where: { userId: id } });
            await tx.account.deleteMany({ where: { userId: id } });
            await tx.verification.deleteMany({ where: { identifier: user.email } });
            await tx.user.delete({ where: { id } });

            return {
                clients: clients.count,
                services: services.count,
                orders: orders.count,
                orderItems: orderItems.count,
                serviceInvoices: serviceInvoices.count,
                expenses: expenses.count,
                debts: debts.count,
                cashMovements: cashMovements.count,
                invoices: invoices.count,
                auditLogs: auditLogs.count,
            };
        }, { timeout: 60_000 });
    },
};
