import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins/admin";
import { expo } from "@better-auth/expo";
import { APIError } from "better-auth/api";
import { prisma } from "../database/prisma";
import { planRepository } from "../repositories/plan.repository";
import { sendMail } from "../email/mailer";
import { resetPasswordEmailTemplate, verificationEmailTemplate } from "../email/templates";
import { auditLogRepository } from "../repositories/audit-log.repository";
import { normalizePhoneForStorage } from "../../domain/validation/normalize-phone";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [
        ...(process.env.FRONTEND_URL ?? "http://localhost:6502").split(","),
        // App mobile (fluxy-gestao-app): o plugin expo() repassa o scheme do app como
        // origem. "exp://" é o Expo Go, usado para rodar o app sem build nativo —
        // navegadores nunca enviam essa origem, então liberá-la não abre CSRF.
        "fluxygestao://",
        "exp://",
        "exp://**",
    ],
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    // Shares the session cookie across subdomains (api./gestao.) so the request stays
    // same-site — required for checkSession()'s SSR cookie-forwarding to see it at all.
    ...(process.env.NODE_ENV === "production" && process.env.COOKIE_DOMAIN
        ? { advanced: { crossSubDomainCookies: { enabled: true, domain: process.env.COOKIE_DOMAIN }, useSecureCookies: true } }
        : {}),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            try {
                await sendMail(user.email, "Redefinir senha — Fluxy Gestão", resetPasswordEmailTemplate(user.name, url));
            } catch (err) {
                console.error("[auth] failed to send reset-password email:", err);
            }
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            try {
                await sendMail(user.email, "Confirme seu e-mail — Fluxy Gestão", verificationEmailTemplate(user.name, url));
            } catch (err) {
                console.error("[auth] failed to send verification email:", err);
            }
        },
    },
    user: {
        additionalFields: {
            // Obrigatórios no cadastro (ver signup.tsx) — necessários para gerar cobrança
            // via Asaas (exige cpfCnpj do cliente); sem isso o job de billing pula o
            // usuário na geração de fatura (ver ensure-asaas-customer.ts).
            phone: { type: "string", required: true },
            avatarUrl: { type: "string", required: false },
            theme: { type: "string", required: false, defaultValue: "light" },
            companyName: { type: "string", required: false },
            cnpj: { type: "string", required: false },
            cpf: { type: "string", required: true },
            cep: { type: "string", required: false },
            address: { type: "string", required: false },
            addressNumber: { type: "string", required: false },
            complement: { type: "string", required: false },
            neighborhood: { type: "string", required: false },
            city: { type: "string", required: false },
            state: { type: "string", required: false },
            logoUrl: { type: "string", required: false },
            primaryColor: { type: "string", required: false, defaultValue: "#8c52ff" },
            pdfColor: { type: "string", required: false, defaultValue: "#8c52ff" },
            includeLogoInPdf: { type: "boolean", required: false, defaultValue: true },
            // Plano de assinatura (slug de Plan), escolhido no cadastro — validado no hook
            // user.create.before abaixo. Depois do cadastro, só muda por PATCH /api/users/me/plan
            // (com validação de downgrade) ou pelo admin; o update-user genérico do better-auth
            // não aceita "plan" (ver databaseHooks.user.update.before).
            plan: { type: "string", required: false, defaultValue: "bronze", input: true },
            // Set only by the daily billing job (invoice overdue) / cleared when payment
            // is confirmed. Not client-settable.
            billingBlocked: { type: "boolean", required: false, defaultValue: false, input: false },
            // Aceite do contrato pago da plataforma, pedido ao fim do mês gratuito — só
            // alterado via POST /api/billing/contract (setContractAcceptanceUsecase), nunca
            // pelo update-user genérico do better-auth.
            contractAccepted: { type: "boolean", required: false, defaultValue: false, input: false },
            contractAcceptedAt: { type: "date", required: false, input: false },
            // Isenção de cobrança definida pelo admin (ex.: funcionários). Só alterado via
            // PATCH /api/admin/users/:userId/billing-exempt (setBillingExemptUsecase).
            billingExempt: { type: "boolean", required: false, defaultValue: false, input: false },
        },
    },
    plugins: [admin(), expo()],
    databaseHooks: {
        user: {
            create: {
                // Normaliza o telefone informado no cadastro (signup.tsx) para o mesmo
                // formato usado em todo o resto do sistema: só dígitos, com DDI 55 na
                // frente. Fora daqui, edições de perfil/empresa passam pelos usecases
                // próprios (não por este hook), que fazem a mesma normalização via
                // updateProfileSchema/updateCompanySchema.
                //
                // Também valida o plano escolhido no cadastro: precisa existir e estar ativo.
                before: async (user) => {
                    const plan = typeof user.plan === "string" && user.plan ? user.plan : "bronze";
                    const found = await planRepository.findBySlug(plan);
                    if (!found || !found.active) {
                        throw new APIError("BAD_REQUEST", { message: "Plano inválido. Escolha um dos planos disponíveis." });
                    }
                    const phone = typeof user.phone === "string" ? normalizePhoneForStorage(user.phone) : user.phone;
                    return { data: { ...user, plan, phone } };
                },
            },
            update: {
                // "plan" é input no cadastro, mas a troca depois dele tem regra própria
                // (downgrade, admin) — então o update-user do better-auth nunca altera o plano.
                before: async (user) => {
                    if (!("plan" in user)) return;
                    const { plan: _ignored, ...rest } = user;
                    return { data: rest };
                },
            },
        },
        session: {
            create: {
                after: async (session) => {
                    await auditLogRepository.create({
                        userId: session.userId,
                        about: "Login realizado",
                        type: "LOGIN",
                    });
                },
            },
            delete: {
                after: async (session) => {
                    await auditLogRepository.create({
                        userId: session.userId,
                        about: "Logout realizado",
                        type: "LOGOUT",
                    });
                },
            },
        },
    },
});