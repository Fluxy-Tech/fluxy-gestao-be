import type { Order, ServiceInvoice, ServiceInvoiceStatus } from "../../../generated/prisma/client";

export interface CreateServiceInvoiceInput {
    clientId: string;
    orderIds: string[];
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
    settle(id: string, userId: string): Promise<ServiceInvoice>;
}

export type { ServiceInvoiceStatus };
