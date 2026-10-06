import { z } from "zod";
import { prisma } from "../../../infrastructure/database/prisma";
import { Prisma } from "../../../../generated/prisma/client";
import { cacheKey, invalidate } from "../../../infrastructure/cache/cache";
import type { AuditLogRepository } from "../../../domain/repository/audit-log.repository";
import { recordAuditLog } from "../audit/record-audit-log.usecase";
import { invalidateOrdersListCache } from "../order/list-orders.usecase";
import { invalidateDashboardCache } from "../order/get-dashboard.usecase";
import { invalidateServiceCaches } from "../service/list-services.usecase";

// Leva para o servidor a base de quem usava o app mobile só no aparelho (antes da
// sincronização existir) — ou de um arquivo de backup do app. SUBSTITUI os dados de
// negócio da conta: apaga clientes, serviços, OS, notas e financeiro e grava os do
// aparelho, mantendo os mesmos IDs (é o formato que o app já usa, ver /me/export).
// Dados de cobrança e da conta (plano, contrato, Asaas, senha) não são tocados.

const rows = z.array(z.record(z.string(), z.any())).default([]);
const importSchema = z.object({
    user: z.record(z.string(), z.any()).optional(),
    clients: rows,
    services: rows,
    orders: rows,
    orderItems: rows,
    serviceInvoices: rows,
    expenses: rows,
    debts: rows,
    cashMovements: rows,
});

const str = (v: unknown) => (v === undefined || v === null || v === "" ? null : String(v));
const date = (v: unknown) => (v ? new Date(String(v)) : null);
const reqDate = (v: unknown) => (v ? new Date(String(v)) : new Date());
const numOr = (v: unknown, d = 0) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? d : Number(v));
const id = (r: Record<string, any>) => {
    const v = String(r.id ?? "");
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(v)) throw new Error("Arquivo com registro sem ID válido.");
    return v;
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);

const PAY = ["PENDING", "PAID", "PARTIAL", "OVERDUE"] as const;

export async function importDeviceDataUsecase(auditLogRepo: AuditLogRepository, userId: string, input: unknown) {
    const data = importSchema.parse(input);
    const u = data.user ?? {};

    const maxNumber = (list: Record<string, any>[], field: string) => list.reduce((m, r) => Math.max(m, numOr(r[field])), 0);

    const counts = await prisma
        .$transaction(
        async (tx) => {
            // Mesma ordem do purge-user-data: filhos antes dos pais (relações Restrict).
            await tx.orderItem.deleteMany({ where: { order: { userId } } });
            await tx.order.deleteMany({ where: { userId } });
            await tx.serviceInvoice.deleteMany({ where: { userId } });
            await tx.service.deleteMany({ where: { userId } });
            await tx.client.deleteMany({ where: { userId } });
            await tx.expense.deleteMany({ where: { userId } });
            await tx.debt.deleteMany({ where: { userId } });
            await tx.cashMovement.deleteMany({ where: { userId } });

            await tx.client.createMany({
                data: data.clients.map((r) => ({
                    id: id(r),
                    userId,
                    name: String(r.name ?? "Cliente"),
                    email: str(r.email),
                    phone: str(r.phone),
                    cep: str(r.cep),
                    address: str(r.address),
                    addressNumber: str(r.addressNumber),
                    complement: str(r.complement),
                    neighborhood: str(r.neighborhood),
                    city: str(r.city),
                    state: str(r.state),
                    cpf: str(r.cpf),
                    cnpj: str(r.cnpj),
                    laborRate: numOr(r.laborRate),
                    discount: numOr(r.discount),
                    increase: numOr(r.increase),
                    active: r.active !== false,
                    createdAt: reqDate(r.createdAt),
                    deletedAt: date(r.deletedAt),
                })),
            });

            await tx.service.createMany({
                data: data.services.map((r) => ({
                    id: id(r),
                    userId,
                    name: String(r.name ?? "Serviço"),
                    description: str(r.description),
                    category: str(r.category),
                    costPrice: numOr(r.costPrice),
                    salePrice: numOr(r.salePrice),
                    active: r.active !== false,
                    showInCatalog: r.showInCatalog !== false,
                    createdAt: reqDate(r.createdAt),
                    deletedAt: date(r.deletedAt),
                })),
            });

            await tx.serviceInvoice.createMany({
                data: data.serviceInvoices.map((r) => ({
                    id: id(r),
                    userId,
                    clientId: String(r.clientId),
                    number: BigInt(Math.trunc(numOr(r.number, 1))),
                    issueDate: reqDate(r.issueDate),
                    totalAmount: numOr(r.totalAmount),
                    status: oneOf(r.status, ["ISSUED", "SETTLED", "CANCELED"] as const, "ISSUED"),
                    settledAt: date(r.settledAt),
                    canceledAt: date(r.canceledAt),
                    cancelReason: str(r.cancelReason),
                    createdAt: reqDate(r.createdAt),
                })),
            });

            // recurringParentId aponta para outra OS: grava sem o vínculo e liga depois,
            // para não depender da ordem das linhas.
            await tx.order.createMany({
                data: data.orders.map((r) => ({
                    id: id(r),
                    userId,
                    clientId: String(r.clientId),
                    numberOrder: BigInt(Math.trunc(numOr(r.numberOrder, 1))),
                    patientName: str(r.patientName),
                    statusOrder: oneOf(r.statusOrder, ["PENDING", "COMPLETED", "CANCELED"] as const, "PENDING"),
                    paymentStatus: oneOf(r.paymentStatus, PAY, "PENDING"),
                    paymentMethod: str(r.paymentMethod),
                    paymentDueDate: date(r.paymentDueDate),
                    amountPaid: numOr(r.amountPaid),
                    lastPaymentAt: date(r.lastPaymentAt),
                    cashCountedAmount: numOr(r.cashCountedAmount),
                    entryDate: reqDate(r.entryDate),
                    deliveryDate: date(r.deliveryDate),
                    completedAt: date(r.completedAt),
                    canceledAt: date(r.canceledAt),
                    cancelReason: str(r.cancelReason),
                    notes: str(r.notes),
                    totalCost: numOr(r.totalCost),
                    totalSale: numOr(r.totalSale),
                    createdBy: userId,
                    createdAt: reqDate(r.createdAt),
                    deletedAt: date(r.deletedAt),
                    recurWeekly: !!r.recurWeekly,
                    recurMonthly: !!r.recurMonthly,
                    nextOccurrenceAt: date(r.nextOccurrenceAt),
                    serviceInvoiceId: str(r.serviceInvoiceId),
                })),
            });
            for (const r of data.orders.filter((o) => o.recurringParentId)) {
                await tx.order.update({ where: { id: id(r) }, data: { recurringParentId: String(r.recurringParentId) } });
            }

            await tx.orderItem.createMany({
                data: data.orderItems.map((r) => ({
                    id: id(r),
                    userId,
                    orderId: String(r.orderId),
                    serviceId: str(r.serviceId),
                    serviceName: str(r.serviceName),
                    costPrice: numOr(r.costPrice),
                    salePrice: numOr(r.salePrice),
                    discount: numOr(r.discount),
                    increase: numOr(r.increase),
                    quantity: numOr(r.quantity, 1),
                    finalPrice: numOr(r.finalPrice),
                    createdAt: reqDate(r.createdAt),
                })),
            });

            await tx.expense.createMany({
                data: data.expenses.map((r) => ({
                    id: id(r),
                    userId,
                    description: String(r.description ?? "Despesa"),
                    amount: numOr(r.amount),
                    category: str(r.category),
                    date: reqDate(r.date),
                    status: oneOf(r.status, ["PENDING", "PAID"] as const, "PENDING"),
                    isRecurring: !!r.isRecurring,
                    recurrenceFrequency: r.isRecurring && r.recurrenceFrequency === "MONTHLY" ? ("MONTHLY" as const) : null,
                    recurrenceEndDate: date(r.recurrenceEndDate),
                    cashCountedUntil: date(r.cashCountedUntil),
                    createdAt: reqDate(r.createdAt),
                    deletedAt: date(r.deletedAt),
                })),
            });

            await tx.debt.createMany({
                data: data.debts.map((r) => ({
                    id: id(r),
                    userId,
                    description: String(r.description ?? "Dívida"),
                    amount: numOr(r.amount),
                    amountPaid: numOr(r.amountPaid),
                    paymentStatus: oneOf(r.paymentStatus, PAY, "PENDING"),
                    category: str(r.category),
                    date: reqDate(r.date),
                    createdAt: reqDate(r.createdAt),
                    deletedAt: date(r.deletedAt),
                })),
            });

            await tx.cashMovement.createMany({
                data: data.cashMovements.map((r) => ({
                    id: id(r),
                    userId,
                    type: oneOf(r.type, ["IN", "OUT"] as const, "IN"),
                    amount: numOr(r.amount),
                    description: String(r.description ?? ""),
                    occurredAt: reqDate(r.occurredAt),
                    createdAt: reqDate(r.createdAt),
                })),
            });

            // Dados da empresa e numeração vêm do aparelho; as sequências nunca ficam
            // abaixo do maior número já usado, para a próxima OS/nota não repetir número.
            await tx.user.update({
                where: { id: userId },
                data: {
                    ...(u.companyName !== undefined ? { companyName: str(u.companyName) } : {}),
                    ...(u.cnpj !== undefined ? { cnpj: str(u.cnpj) } : {}),
                    ...(u.cpf ? { cpf: String(u.cpf) } : {}),
                    ...(u.cep !== undefined ? { cep: str(u.cep) } : {}),
                    ...(u.address !== undefined ? { address: str(u.address) } : {}),
                    ...(u.addressNumber !== undefined ? { addressNumber: str(u.addressNumber) } : {}),
                    ...(u.complement !== undefined ? { complement: str(u.complement) } : {}),
                    ...(u.neighborhood !== undefined ? { neighborhood: str(u.neighborhood) } : {}),
                    ...(u.city !== undefined ? { city: str(u.city) } : {}),
                    ...(u.state !== undefined ? { state: str(u.state) } : {}),
                    ...(["STANDARD", "HAIRDRESSER", "LAB", "PETSHOP"].includes(u.businessCategory) ? { businessCategory: u.businessCategory } : {}),
                    ...(typeof u.primaryColor === "string" ? { primaryColor: u.primaryColor } : {}),
                    ...(typeof u.pdfColor === "string" ? { pdfColor: u.pdfColor } : {}),
                    ...(typeof u.includeLogoInPdf === "boolean" ? { includeLogoInPdf: u.includeLogoInPdf } : {}),
                    currentCash: numOr(u.currentCash),
                    cashReconciledAt: date(u.cashReconciledAt),
                    orderSequence: BigInt(Math.max(numOr(u.orderSequence), maxNumber(data.orders, "numberOrder"))),
                    invoiceSequence: BigInt(Math.max(numOr(u.invoiceSequence), maxNumber(data.serviceInvoices, "number"))),
                },
            });

            return {
                clients: data.clients.length,
                services: data.services.length,
                orders: data.orders.length,
                serviceInvoices: data.serviceInvoices.length,
                expenses: data.expenses.length,
                debts: data.debts.length,
            };
        },
        { timeout: 120_000 },
        )
        .catch((err) => {
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
                throw new Error("Alguns registros do aparelho já pertencem a outra conta. Use a mesma conta de onde os dados vieram.");
            }
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
                throw new Error("Os dados do aparelho têm registros ligados a itens que não existem (ex.: OS sem cliente).");
            }
            throw err;
        });

    await Promise.all([
        invalidateOrdersListCache(userId),
        invalidateDashboardCache(userId),
        invalidateServiceCaches(userId),
        invalidate(cacheKey("clients", userId)),
    ]);
    await recordAuditLog(auditLogRepo, {
        userId,
        about: "Dados do app mobile enviados para a nuvem (substituíram os dados da conta)",
        type: "UPDATE",
        entityType: "user-data",
        metadata: { counts },
    });
    return counts;
}
