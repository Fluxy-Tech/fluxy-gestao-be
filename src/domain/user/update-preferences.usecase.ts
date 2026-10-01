import type { UserRepository } from "../repository/user.repository";
import { updatePreferencesSchema } from "../validation/user.schema";

// Preferência de visualização do dashboard (tabela ou calendário), salva no perfil.
export function updatePreferencesUsecase(repo: UserRepository, userId: string, input: unknown) {
    const { dashboardView } = updatePreferencesSchema.parse(input);
    return repo.setDashboardView(userId, dashboardView);
}
