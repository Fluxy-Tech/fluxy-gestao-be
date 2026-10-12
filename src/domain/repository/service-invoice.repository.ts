import type { Order, ServiceInvoice, ServiceInvoiceStatus } from "../../../generated/prisma/client";

export interface CreateServiceInvoiceInput {
    id?: string;
    clientId: string;
    orderIds: string[];
}

export interface UpdateServiceInvoicePaymentInput {
    paymentStatus: "PENDING" | "PARTIAL" | "PAID";
    amountPaid: number;
    // Saldo do cliente usado agora neste pagamento (sai do saldo).
    useCredit?: number;
    // Valor recebido acima do total da nota — vira saldo do cliente.
    overpayment?: number;
}

export interface ListServiceInvoiceFilters {
    clientId?: string;
    number?: bigint;
    start?: Date;
    end?: Date;
}

export type ServiceInvoiceWithClient = ServiceInvoice & {
    client: { name: string };
    orders: Pick<Order, "id" | "numberOrder">[];
};

export interface ServiceInvoiceRepository {
    findManyByUser(userId: string, filters: ListServiceInvoiceFilters): Promise<ServiceInvoiceWithClient[]>;
    findDetailById(id: string, userId: string): Promise<ServiceInvoiceWithClient | null>;
    createWithOrders(userId: string, data: CreateServiceInvoiceInput): Promise<ServiceInvoice>;
    cancel(id: string, userId: string, cancelReason?: string | null): Promise<ServiceInvoice>;
    reopen(id: string, userId: string): Promise<ServiceInvoice>;
    settle(id: string, userId: string): Promise<ServiceInvoice>;
    updatePayment(id: string, userId: string, data: UpdateServiceInvoicePaymentInput): Promise<ServiceInvoice>;
    updateOrders(id: string, userId: string, orderIds: string[]): Promise<ServiceInvoice>;
}

export type { ServiceInvoiceStatus };
