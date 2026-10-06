import type { Expense, ExpenseStatus, RecurrenceFrequency } from "../../../generated/prisma/client";

export interface CreateExpenseInput {
    id?: string;
    description: string;
    amount: number;
    category?: string | null;
    date: string;
    status?: ExpenseStatus;
    isRecurring?: boolean;
    recurrenceFrequency?: RecurrenceFrequency | null;
    recurrenceEndDate?: string | null;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface ListExpensesFilters {
    start?: Date;
    end?: Date;
    status?: ExpenseStatus;
}

export interface ExpenseRepository {
    findAllByUser(userId: string, filters?: ListExpensesFilters): Promise<Expense[]>;
    findById(id: string, userId: string): Promise<Expense | null>;
    create(userId: string, data: CreateExpenseInput): Promise<Expense>;
    update(id: string, userId: string, data: UpdateExpenseInput): Promise<Expense>;
    softDelete(id: string, userId: string): Promise<void>;
    // Returns one-off expenses inside [start,end] plus recurring templates whose
    // recurrence window overlaps [start,end] (for the usecase to expand into occurrences).
    findRelevantForRange(userId: string, start: Date, end: Date): Promise<Expense[]>;
}
