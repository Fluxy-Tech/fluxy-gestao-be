import type { BusinessCategory, User } from "../../../generated/prisma/client";

export interface UpdateProfileInput {
    name?: string;
    phone?: string | null;
    theme?: string;
}

export interface UpdateCompanyInput {
    businessCategory?: BusinessCategory;
    businessSegment?: string;
    companyName?: string | null;
    cnpj?: string | null;
    cpf?: string | null;
    phone?: string | null;
    cep?: string | null;
    address?: string | null;
    addressNumber?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    currentCash?: number;
}

export interface UpdateBrandInput {
    primaryColor?: string;
    pdfColor?: string;
    includeLogoInPdf?: boolean;
    logoUrl?: string;
}

export interface UserRepository {
    findById(id: string): Promise<User | null>;
    // Usado pelo assistente do WhatsApp (Fly) para identificar o usuário pelo número
    // que enviou a mensagem. `phone` não é @unique nem indexado. O telefone recebido
    // (DDI e o 9º dígito do celular são opcionais) é normalizado para DDD + 8 dígitos
    // locais e, a partir daí, reconstruídas as formas gravadas no banco (com e sem o
    // 9º dígito, sempre com DDI 55 — ver normalizePhoneForStorage) para buscar por
    // igualdade exata contra essas variantes.
    findByPhone(phone: string): Promise<User | null>;
    updateProfile(id: string, data: UpdateProfileInput): Promise<User>;
    updateCompany(id: string, data: UpdateCompanyInput): Promise<User>;
    updateBrand(id: string, data: UpdateBrandInput): Promise<User>;
    count(): Promise<number>;
    // Billing — usuários pagantes (role != admin) cadastrados antes do início do mês
    // corrente (já passaram do primeiro mês gratuito), não isentos pelo admin e que já
    // confirmaram a contratação da plataforma. Quem ainda não confirmou fica de fora — não
    // gera fatura, e requireActiveBilling bloqueia o acesso até o aceite.
    findBillableBeforeMonth(monthStart: Date): Promise<User[]>;
    setAsaasCustomerId(id: string, asaasCustomerId: string): Promise<void>;
    setBillingBlocked(id: string, blocked: boolean): Promise<void>;
    setContractAcceptance(id: string, accepted: boolean): Promise<User>;
    setBillingExempt(id: string, exempt: boolean): Promise<void>;
    setPlan(id: string, plan: string): Promise<User>;
    setDashboardView(id: string, view: "table" | "calendar"): Promise<User>;
    // Exclusão definitiva (painel admin): apaga o usuário e todos os dados dele numa
    // transação só. Devolve quantas linhas foram removidas de cada tabela.
    deleteWithAllData(id: string): Promise<Record<string, number>>;
}
