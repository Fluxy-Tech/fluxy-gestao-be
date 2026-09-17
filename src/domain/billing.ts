// Preço mensal da assinatura — plano único.
export const SUBSCRIPTION_PRICE = 19.99;

export function planPrice(_plan: string): number {
    return SUBSCRIPTION_PRICE;
}

export function monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

// O primeiro mês do usuário na plataforma é gratuito (mesma regra usada por
// findBillableBeforeMonth): o "teste grátis" termina quando vira o mês seguinte ao do
// cadastro, não exatamente 30 dias corridos depois.
export function trialEnded(createdAt: Date, now = new Date()): boolean {
    return createdAt < startOfMonth(now);
}

export function lastDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function toAsaasDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export type InvoiceDisplayStatus = "paid" | "open" | "overdue" | "canceled";

export function invoiceDisplayStatus(status: string, dueDate: Date, now = new Date()): InvoiceDisplayStatus {
    if (status === "PAID") return "paid";
    if (status === "CANCELED") return "canceled";
    return dueDate < now ? "overdue" : "open";
}
