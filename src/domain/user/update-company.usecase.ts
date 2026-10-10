import type { UserRepository } from "../repository/user.repository";
import { updateCompanySchema } from "../validation/user.schema";
import { findBusinessSegment } from "../business-segments";
import { usesScheduling } from "../order-scheduling";

export async function updateCompanyUsecase(repo: UserRepository, userId: string, input: unknown) {
    const data = updateCompanySchema.parse(input);
    // O segmento escolhido define o comportamento do app (agenda, nome do paciente) — o
    // businessCategory é sempre derivado dele, nunca escolhido à parte.
    if (data.businessSegment !== undefined) {
        const segment = findBusinessSegment(data.businessSegment);
        if (!segment) throw new Error("Ramo de atuação inválido.");
        data.businessCategory = segment.category;

        // Trocou para um ramo que agenda horário nas OS: a agenda (Calendário) já vem
        // ligada, a menos que o cliente tenha mandado useCalendar explicitamente.
        if (data.useCalendar === undefined && usesScheduling(segment.category)) {
            const current = await repo.findById(userId);
            if (current && current.businessCategory !== segment.category) data.useCalendar = true;
        }
    }
    return repo.updateCompany(userId, data);
}
