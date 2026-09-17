import type { Invoice, InvoiceStatus } from "../../../generated/prisma/client";

export type OverdueInvoiceWithUser = Invoice & {
    user: {
        name: string;
        email: string;
        companyName: string | null;
        plan: string;
        billingBlocked: boolean;
    };
};

export interface CreateInvoiceInput {
    referenceMonth: string;
    amount: number;
    dueDate: Date;
    asaasPaymentId: string;
    asaasInvoiceUrl: string;
}

export interface UpdateInvoicePaymentInput {
    asaasPaymentId: string;
    asaasInvoiceUrl: string;
    dueDate: Date;
    status: InvoiceStatus;
}

export interface InvoiceRepository {
    findAllByUser(userId: string): Promise<Invoice[]>;
    findById(id: string): Promise<Invoice | null>;
    findByUserAndMonth(userId: string, referenceMonth: string): Promise<Invoice | null>;
    findByAsaasPaymentId(asaasPaymentId: string): Promise<Invoice | null>;
    findPendingWithPaymentId(userId?: string): Promise<Invoice[]>;
    findUnpaidDueBefore(userId: string, before: Date): Promise<Invoice[]>;
    findAllUnpaidDueBefore(before: Date): Promise<Invoice[]>;
    findOverdueWithUser(before: Date): Promise<OverdueInvoiceWithUser[]>;
    create(userId: string, data: CreateInvoiceInput): Promise<Invoice>;
    markPaid(id: string): Promise<Invoice>;
    cancel(id: string): Promise<Invoice>;
    updatePaymentLink(id: string, data: UpdateInvoicePaymentInput): Promise<Invoice>;
}
