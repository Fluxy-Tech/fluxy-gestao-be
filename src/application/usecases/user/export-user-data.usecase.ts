import { prisma } from "../../../infrastructure/database/prisma";

// Exporta toda a base da conta autenticada — usado pelo app mobile, que passou a guardar
// os dados no próprio aparelho e importa tudo daqui uma vez (e-mail + senha). Inclui os
// registros com exclusão lógica (deletedAt), porque OS antigas continuam apontando para
// clientes/serviços removidos e o histórico precisa chegar inteiro.
export async function exportUserDataUsecase(userId: string) {
    const [user, clients, services, orders, orderItems, serviceInvoices, expenses, debts, cashMovements] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            // Dados de cobrança da plataforma (Asaas) não fazem sentido fora do servidor.
            omit: { asaasCustomerId: true },
        }),
        prisma.client.findMany({ where: { userId } }),
        prisma.service.findMany({ where: { userId } }),
        prisma.order.findMany({ where: { userId } }),
        prisma.orderItem.findMany({ where: { userId } }),
        prisma.serviceInvoice.findMany({ where: { userId } }),
        prisma.expense.findMany({ where: { userId } }),
        prisma.debt.findMany({ where: { userId } }),
        prisma.cashMovement.findMany({ where: { userId } }),
    ]);
    if (!user) throw new Error("Usuário não encontrado.");

    return {
        version: 1,
        exportedAt: new Date(),
        user: [user],
        clients,
        services,
        orders,
        orderItems,
        serviceInvoices,
        expenses,
        debts,
        cashMovements,
    };
}
