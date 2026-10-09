import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./src/infrastructure/auth/auth";
import { requireActiveBilling, requireAdmin, requireAuth } from "./src/infrastructure/auth/require-auth.middleware";
import { requireInternalService } from "./src/infrastructure/auth/require-internal-service.middleware";
import { clientRoutes } from "./src/presentation/routes/client.routes";
import { serviceRoutes } from "./src/presentation/routes/service.routes";
import { orderRoutes } from "./src/presentation/routes/order.routes";
import { serviceInvoiceRoutes } from "./src/presentation/routes/service-invoice.routes";
import { userRoutes } from "./src/presentation/routes/user.routes";
import { adminRoutes } from "./src/presentation/routes/admin.routes";
import { publicRoutes } from "./src/presentation/routes/public.routes";
import { expenseRoutes } from "./src/presentation/routes/expense.routes";
import { debtRoutes } from "./src/presentation/routes/debt.routes";
import { billingRoutes } from "./src/presentation/routes/billing.routes";
import { asaasWebhookRoutes } from "./src/presentation/routes/asaas-webhook.routes";
import { assistantRoutes } from "./src/presentation/routes/assistant.routes";
import { communityRoutes } from "./src/presentation/routes/community.routes";
import { supportRoutes } from "./src/presentation/routes/support.routes";
import { errorHandler } from "./src/presentation/error-handler";
import { scheduleDailyCashReconciliation } from "./src/infrastructure/jobs/daily-cash-reconciliation.job";
import { scheduleDailyBilling } from "./src/infrastructure/jobs/daily-billing.job";
import { scheduleRecurringOrders } from "./src/infrastructure/jobs/recurring-orders.job";

const app = express();

app.use(
  cors({
    origin: (process.env.FRONTEND_URL ?? "http://localhost:6502,https://gestao.fluxytechnologies.com.br").split(","),
    credentials: true,
  }),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

// A importação da base do app mobile manda todos os dados de uma vez — limite maior só
// nessa rota (o express.json global abaixo pula corpos já lidos aqui).
app.use("/api/users/me/import-device", express.json({ limit: "50mb" }));
app.use(express.json());

app.get("/", (_, res) => {
  res.send("API funcionando!");
});

app.use("/api/public", publicRoutes);
app.use("/api/clients", requireAuth, requireActiveBilling, clientRoutes);
app.use("/api/services", requireAuth, requireActiveBilling, serviceRoutes);
app.use("/api/orders", requireAuth, requireActiveBilling, orderRoutes);
app.use("/api/service-invoices", requireAuth, requireActiveBilling, serviceInvoiceRoutes);
app.use("/api/users", requireAuth, userRoutes);
app.use("/api/admin", requireAuth, requireAdmin, adminRoutes);
app.use("/api/expenses", requireAuth, requireActiveBilling, expenseRoutes);
app.use("/api/debts", requireAuth, requireActiveBilling, debtRoutes);
app.use("/api/billing", requireAuth, billingRoutes);
// Sem requireActiveBilling: anúncios e suporte continuam acessíveis com a conta bloqueada
// (é justamente quando o usuário mais precisa de ajuda).
app.use("/api/community", requireAuth, communityRoutes);
app.use("/api/support", requireAuth, supportRoutes);
app.use("/api/webhooks/asaas", asaasWebhookRoutes);
app.use("/api/internal/assistant", requireInternalService, assistantRoutes);

app.use(errorHandler);

scheduleDailyCashReconciliation();
scheduleDailyBilling();
scheduleRecurringOrders();

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
