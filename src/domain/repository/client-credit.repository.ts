import type { ClientCreditMovement } from "../../../generated/prisma/client";

export interface ManualCreditInput {
    type: "IN" | "OUT";
    amount: number;
    description?: string | null;
    // true = dinheiro de verdade entrou (adiantamento) ou saiu (devolução) do caixa.
    affectsCash: boolean;
}

export type ClientCreditStatementItem = ClientCreditMovement & {
    order: { numberOrder: bigint } | null;
    serviceInvoice: { number: bigint } | null;
};

export interface ClientCreditStatement {
    clientId: string;
    clientName: string;
    balance: number;
    movements: ClientCreditStatementItem[];
}

export interface ClientCreditRepository {
    getStatement(clientId: string, userId: string): Promise<ClientCreditStatement | null>;
    addManual(clientId: string, userId: string, data: ManualCreditInput): Promise<ClientCreditStatement>;
}
