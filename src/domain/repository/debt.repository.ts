import type { Debt, PaymentStatus } from "../../../generated/prisma/client";

export interface CreateDebtInput {
    id?: string;
    description: string;
    amount: number;
    category?: string | null;
    date: string;
    paymentStatus: PaymentStatus;
    amountPaid: number;
}

export type UpdateDebtInput = Partial<CreateDebtInput>;

export interface ListDebtsFilters {
    start?: Date;
    end?: Date;
    status?: PaymentStatus;
}

export interface DebtRepository {
    findAllByUser(userId: string, filters?: ListDebtsFilters): Promise<Debt[]>;
    findById(id: string, userId: string): Promise<Debt | null>;
    create(userId: string, data: CreateDebtInput): Promise<Debt>;
    update(id: string, userId: string, data: UpdateDebtInput): Promise<Debt>;
    softDelete(id: string, userId: string): Promise<void>;
}
