import type {
    Client,
    Order,
    OrderItem,
    OrderStatus,
    PaymentStatus,
    ServiceInvoiceStatus,
} from "../../../generated/prisma/client";

export interface CreateOrderItemInput {
    serviceId?: string | null;
    serviceName?: string | null;
    costPrice: number;
    salePrice: number;
    discount?: number;
    increase?: number;
    quantity?: number;
    finalPrice: number;
}

export interface CreateOrderInput {
    id?: string;
    clientId: string;
    patientName?: string | null;
    notes?: string | null;
    paymentMethod?: string | null;
    deliveryDate?: string | null;
    paymentDueDate?: string | null;
    discount?: number;
    increase?: number;
    totalCost: number;
    totalSale: number;
    items: CreateOrderItemInput[];
    recurWeekly?: boolean;
    recurMonthly?: boolean;
}

export interface UpdatePaymentInput {
    paymentStatus: PaymentStatus;
    amountPaid: number;
}

export interface UpdateOrderItemsInput {
    items: CreateOrderItemInput[];
    discount?: number;
    increase?: number;
    totalCost: number;
    totalSale: number;
}

export type OrderWithClientName = Order & { client: { name: string } };
export type OrderItemWithServiceName = OrderItem & { service: { name: string } | null };
export type OrderDetail = Order & {
    client: Client | null;
    items: OrderItemWithServiceName[];
    recurringParent: { numberOrder: bigint } | null;
};
export type OrderWithItems = Order & {
    items: OrderItemWithServiceName[];
    serviceInvoice: { status: ServiceInvoiceStatus } | null;
};

export interface DashboardCounts {
    todayCount: number;
    yesterdayCount: number;
    todayOrders: Pick<Order, "id" | "numberOrder" | "totalSale" | "statusOrder" | "paymentStatus" | "clientId">[];
    todayPaid: Pick<Order, "id" | "totalSale" | "totalCost" | "amountPaid" | "paymentStatus">[];
    // OS pagas (total ou parcialmente) na semana corrente, de segunda a domingo.
    weekStart: Date;
    weekPaid: Pick<Order, "totalSale" | "totalCost" | "amountPaid" | "paymentStatus" | "lastPaymentAt">[];
}

export interface OrderRepository {
    findOpenByUser(userId: string): Promise<OrderWithClientName[]>;
    findClosedByUser(userId: string): Promise<OrderWithClientName[]>;
    findReceivableByUser(userId: string): Promise<OrderWithClientName[]>;
    findByClientId(userId: string, clientId: string): Promise<OrderWithItems[]>;
    findDetailById(id: string, userId: string): Promise<OrderDetail | null>;
    findByNumber(userId: string, numberOrder: bigint): Promise<OrderDetail | null>;
    findByDateRange(userId: string, start: Date, end: Date, status?: OrderStatus): Promise<Order[]>;
    findItemsByDateRange(userId: string, start: Date, end: Date, status?: OrderStatus): Promise<OrderItemWithServiceName[]>;
    // Calendário do dashboard: toda OS (qualquer status) cuja data de ENTREGA cai no
    // intervalo — diferente de findPaidByDeliveryDateRange, que só traz OS pagas
    // integralmente (usado pelo gráfico de faturamento do relatório).
    findByDeliveryDateRange(userId: string, start: Date, end: Date): Promise<Order[]>;
    // Faturamento/custo do relatório precisam do dinheiro recebido DENTRO do período —
    // isto é, por completedAt (quando a OS foi finalizada/paga), não por createdAt (quando
    // foi criada). Uma OS criada em um mês e finalizada/paga no seguinte deve contar como
    // faturamento do mês em que o dinheiro entrou, não do mês em que foi aberta.
    findCashReceivedByDateRange(userId: string, start: Date, end: Date, status?: OrderStatus): Promise<Order[]>;
    // Gráfico "Faturamento no período": soma por dia de ENTREGA (deliveryDate), não pela
    // data em que o pagamento entrou — mostra em quais dias o trabalho entregue gerou mais
    // receita, independente de quando o cliente efetivamente pagou. Só considera OS pagas
    // integralmente (parcial não entra no faturamento consolidado do relatório).
    findPaidByDeliveryDateRange(userId: string, start: Date, end: Date, status?: OrderStatus): Promise<Order[]>;
    getDashboardCounts(userId: string): Promise<DashboardCounts>;
    createWithItems(userId: string, data: CreateOrderInput): Promise<Order>;
    updateItems(id: string, userId: string, data: UpdateOrderItemsInput): Promise<Order>;
    updateStatus(
        id: string,
        userId: string,
        data: { statusOrder: OrderStatus; completedAt?: Date | null; canceledAt?: Date | null; cancelReason?: string | null },
    ): Promise<Order>;
    updatePaymentStatus(id: string, userId: string, data: UpdatePaymentInput): Promise<Order>;
    updateDeliveryDate(id: string, userId: string, deliveryDate: Date | null): Promise<Order>;
    updateNotes(id: string, userId: string, notes: string | null): Promise<Order>;
    stopRecurrence(id: string, userId: string): Promise<Order>;
    softDelete(id: string, userId: string): Promise<void>;
}
