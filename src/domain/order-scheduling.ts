import type { BusinessCategory } from "../../generated/prisma/client";

// Cabeleireiro/PetShop agendam horário de atendimento (a OS carrega data + hora reais,
// escolhidas pelo usuário). Padrão/Laboratório só preveem uma data de entrega, sem
// horário — ver resolveDeliveryDate abaixo.
const SCHEDULING_CATEGORIES: BusinessCategory[] = ["HAIRDRESSER", "PETSHOP"];

export function usesScheduling(category: BusinessCategory): boolean {
    return SCHEDULING_CATEGORIES.includes(category);
}

// A OS coleta horário (data + hora) quando o ramo agenda horário OU quando a empresa usa
// a agenda (useCalendar, em Empresa) — o calendário precisa do horário para posicionar a OS.
export function collectsTime(user: { businessCategory: BusinessCategory; useCalendar: boolean }): boolean {
    return usesScheduling(user.businessCategory) || user.useCalendar;
}

// deliveryDate é sempre gravado como um instante completo (data + hora). Quem coleta
// horário (ver collectsTime) envia o horário escolhido pelo usuário como está — espera-se
// um ISO com offset explícito (ex.: "2026-07-16T14:30:00-03:00"), pra não depender do fuso
// do servidor. Quem não coleta só escolhe a data; fixamos 08:00 (horário de Brasília) pra
// não deixar a OS com hora vazia/zerada — o mesmo vale se vier só a data (ex.: app antigo).
export function resolveDeliveryDate(
    user: { businessCategory: BusinessCategory; useCalendar: boolean },
    raw: string | null | undefined,
): string | null {
    if (!raw) return null;
    if (collectsTime(user) && raw.length > 10) return raw;
    const datePart = raw.slice(0, 10);
    return `${datePart}T08:00:00-03:00`;
}
