import cron from "node-cron";
import { invoiceRepository } from "../repositories/invoice.repository";
import { userRepository } from "../repositories/user.repository";
import { syncInvoiceStatusesUsecase } from "../../application/usecases/billing/sync-invoice-statuses.usecase";
import { blockOverdueUsersUsecase } from "../../application/usecases/billing/block-overdue-users.usecase";
import { planRepository } from "../repositories/plan.repository";
import { generateMonthlyInvoicesUsecase } from "../../application/usecases/billing/generate-monthly-invoices.usecase";

// Roda todo dia às 07h: primeiro sincroniza pagamentos pendentes com a Asaas (para
// não bloquear quem já pagou mas ainda não tinha sido refletido), depois bloqueia
// quem ficou com fatura vencida sem pagar, e por fim gera a fatura do mês corrente
// para quem já passou do primeiro mês gratuito.
export async function runDailyBilling(): Promise<void> {
    const { paid } = await syncInvoiceStatusesUsecase(invoiceRepository, userRepository);
    const { blocked } = await blockOverdueUsersUsecase(invoiceRepository, userRepository);
    const { generated, failed } = await generateMonthlyInvoicesUsecase(userRepository, invoiceRepository, planRepository);

    console.log(
        `[billing] ${new Date().toISOString()} — pagas: ${paid}, bloqueados: ${blocked}, faturas geradas: ${generated}, falhas: ${failed}`,
    );
}

export function scheduleDailyBilling(): void {
    cron.schedule("0 7 * * *", () => {
        runDailyBilling().catch((err) => console.error("[billing] job falhou:", err));
    });
}
