// Client HTTP para a API do Asaas (gateway de pagamento — boleto/pix/cartão).
// Docs: https://docs.asaas.com. Autenticação por header `access_token`, não Bearer.
const BASE_URL = process.env.ASAAS_API_URL ?? "https://api.asaas.com/v3";

class AsaasError extends Error {
    constructor(message: string, public status: number, public body: unknown) {
        super(message);
    }
}

async function asaasFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            access_token: process.env.ASAAS_TOKEN ?? "",
            ...options?.headers,
        },
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const message = body?.errors?.[0]?.description ?? "Falha ao comunicar com o Asaas.";
        throw new AsaasError(message, res.status, body);
    }
    return body as T;
}

export interface AsaasCustomer {
    id: string;
}

export interface AsaasPayment {
    id: string;
    status: string;
    dueDate: string;
    value: number;
    invoiceUrl: string;
    bankSlipUrl?: string;
}

export function createAsaasCustomer(input: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone?: string | null;
}): Promise<AsaasCustomer> {
    return asaasFetch<AsaasCustomer>("/customers", {
        method: "POST",
        body: JSON.stringify({
            name: input.name,
            email: input.email,
            cpfCnpj: input.cpfCnpj,
            mobilePhone: input.phone ?? undefined,
        }),
    });
}

// billingType "UNDEFINED" deixa o pagador escolher no checkout hospedado da Asaas
// (invoiceUrl): boleto, Pix ou cartão de crédito/débito. O número de parcelas
// oferecido no cartão é configurado no painel da Asaas (Configurações > Parcelamento),
// não por esta chamada — para forçar 1x, ajuste o limite de parcelas lá.
export function createAsaasPayment(input: {
    customerId: string;
    value: number;
    dueDate: string; // "YYYY-MM-DD"
    description: string;
    externalReference: string;
}): Promise<AsaasPayment> {
    return asaasFetch<AsaasPayment>("/payments", {
        method: "POST",
        body: JSON.stringify({
            customer: input.customerId,
            billingType: "UNDEFINED",
            value: input.value,
            dueDate: input.dueDate,
            description: input.description,
            externalReference: input.externalReference,
        }),
    });
}

export function getAsaasPayment(paymentId: string): Promise<AsaasPayment> {
    return asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
}

// Cancela/exclui uma cobrança ainda não paga no Asaas (usado quando um usuário é
// retroativamente isentado depois que o boleto do mês já tinha sido gerado).
export function cancelAsaasPayment(paymentId: string): Promise<void> {
    return asaasFetch<void>(`/payments/${paymentId}`, { method: "DELETE" });
}

// Status que a Asaas usa para indicar que o dinheiro já entrou (boleto compensado,
// pix recebido ou baixa manual em dinheiro).
export const ASAAS_PAID_STATUSES = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
