import { z } from "zod";
import { prisma } from "../../../infrastructure/database/prisma";

// Link público de OS e de nota de serviço (/os/:id e /nota/:id no web), para o usuário
// mandar ao cliente dele. Quem tem o link vê o documento sem login, então só sai o que já
// iria no documento impresso para o cliente — e menos:
// - nada de custo, margem, observações internas, motivo de cancelamento ou dados de
//   cobrança da plataforma;
// - do cliente, só o nome (sem CPF/CNPJ, endereço ou contatos);
// - o nome do paciente sai abreviado (iniciais), porque junto de um trabalho
//   odontológico é dado de saúde (LGPD art. 5º, II) e a página não tem login.
// Os IDs são cuid (web) ou UUID v4 (app) — não dá para listar ou adivinhar documentos.

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "Link inválido.");

function maskPatient(name: string | null) {
    if (!name?.trim()) return null;
    const parts = name.trim().split(/\s+/);
    return parts.map((p) => `${p[0]!.toUpperCase()}.`).join(" ");
}

const companySelect = {
    name: true,
    companyName: true,
    logoUrl: true,
    pdfColor: true,
    primaryColor: true,
    includeLogoInPdf: true,
    phone: true,
    email: true,
    cnpj: true,
    city: true,
    state: true,
} as const;

type CompanyRow = {
    name: string;
    companyName: string | null;
    logoUrl: string | null;
    pdfColor: string;
    primaryColor: string;
    includeLogoInPdf: boolean;
    phone: string | null;
    email: string;
    cnpj: string | null;
    city: string | null;
    state: string | null;
};

const DEFAULT_BRAND_COLOR = "#8c52ff";

function publicCompany(u: CompanyRow) {
    return {
        name: u.companyName || u.name,
        logoUrl: u.includeLogoInPdf ? u.logoUrl : null,
        // Páginas públicas (links de OS e nota) usam a "Cor primária" da tela Empresa; o
        // "Destaque do PDF" fica só para os PDFs. Sem cor válida, o roxo padrão da Fluxy.
        color: /^#[0-9a-f]{6}$/i.test(u.primaryColor ?? "") ? u.primaryColor : DEFAULT_BRAND_COLOR,
        phone: u.phone,
        email: u.email,
        cnpj: u.cnpj,
        city: u.city,
        state: u.state,
    };
}

const itemsOf = (items: { serviceName: string | null; service: { name: string } | null; quantity: unknown; finalPrice: unknown }[]) =>
    items.map((i) => ({
        name: i.serviceName ?? i.service?.name ?? "Serviço",
        quantity: Number(i.quantity),
        total: Number(i.finalPrice),
    }));

export async function getPublicOrderUsecase(rawId: unknown) {
    const id = idSchema.parse(rawId);
    const order = await prisma.order.findFirst({
        where: { id, deletedAt: null },
        include: {
            client: { select: { name: true } },
            user: { select: companySelect },
            orderItems: { orderBy: { createdAt: "asc" }, include: { service: { select: { name: true } } } },
        },
    });
    if (!order) throw new Error("Ordem de serviço não encontrada.");

    return {
        type: "order" as const,
        number: order.numberOrder,
        status: order.statusOrder,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paymentDueDate: order.paymentDueDate,
        entryDate: order.entryDate,
        deliveryDate: order.deliveryDate,
        completedAt: order.completedAt,
        canceledAt: order.canceledAt,
        patient: maskPatient(order.patientName),
        client: order.client.name,
        total: Number(order.totalSale),
        amountPaid: Number(order.amountPaid),
        items: itemsOf(order.orderItems),
        company: publicCompany(order.user),
    };
}

export async function getPublicServiceInvoiceUsecase(rawId: unknown) {
    const id = idSchema.parse(rawId);
    const invoice = await prisma.serviceInvoice.findUnique({
        where: { id },
        include: {
            client: { select: { name: true } },
            user: { select: companySelect },
            orders: {
                where: { deletedAt: null },
                orderBy: { numberOrder: "asc" },
                include: { orderItems: { orderBy: { createdAt: "asc" }, include: { service: { select: { name: true } } } } },
            },
        },
    });
    if (!invoice) throw new Error("Nota não encontrada.");

    return {
        type: "invoice" as const,
        number: invoice.number,
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        issueDate: invoice.issueDate,
        settledAt: invoice.settledAt,
        canceledAt: invoice.canceledAt,
        client: invoice.client.name,
        total: Number(invoice.totalAmount),
        amountPaid: Number(invoice.amountPaid),
        orders: invoice.orders.map((o) => ({
            number: o.numberOrder,
            entryDate: o.entryDate,
            patient: maskPatient(o.patientName),
            total: Number(o.totalSale),
            items: itemsOf(o.orderItems),
        })),
        company: publicCompany(invoice.user),
    };
}
