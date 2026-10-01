import type { UserRepository } from "../repository/user.repository";
import { updateCompanySchema } from "../validation/user.schema";
import { findBusinessSegment } from "../business-segments";

export function updateCompanyUsecase(repo: UserRepository, userId: string, input: unknown) {
    const data = updateCompanySchema.parse(input);
    // O segmento escolhido define o comportamento do app (agenda, nome do paciente) — o
    // businessCategory é sempre derivado dele, nunca escolhido à parte.
    if (data.businessSegment !== undefined) {
        const segment = findBusinessSegment(data.businessSegment);
        if (!segment) throw new Error("Ramo de atuação inválido.");
        data.businessCategory = segment.category;
    }
    return repo.updateCompany(userId, data);
}
