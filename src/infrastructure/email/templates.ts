export function verificationEmailTemplate(name: string, url: string) {
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #8c52ff;">Fluxy Gestão</h2>
            <p>Olá, ${name}!</p>
            <p>Confirme seu e-mail para ativar sua conta no Fluxy Gestão.</p>
            <p>
                <a href="${url}" style="background: #8c52ff; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Confirmar e-mail
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">Se você não criou esta conta, ignore este e-mail.</p>
        </div>
    `;
}

export function invoiceEmailTemplate(name: string, amount: string, dueDate: string, url: string) {
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #8c52ff;">Fluxy Gestão</h2>
            <p>Olá, ${name}!</p>
            <p>Sua fatura da assinatura Fluxy Gestão já está disponível: <strong>${amount}</strong>, com vencimento em <strong>${dueDate}</strong>.</p>
            <p>
                <a href="${url}" style="background: #8c52ff; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Pagar fatura
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">Pague até o vencimento para manter sua conta ativa.</p>
        </div>
    `;
}

export function accountBlockedEmailTemplate(name: string, referenceMonth: string, url: string) {
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #8c52ff;">Fluxy Gestão</h2>
            <p>Olá, ${name}!</p>
            <p>Identificamos que a fatura referente a <strong>${referenceMonth}</strong> não foi paga até o vencimento. Por isso, o acesso às funcionalidades do sistema foi temporariamente bloqueado.</p>
            <p>
                <a href="${url}" style="background: #8c52ff; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Regularizar pagamento
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">Assim que o pagamento for identificado, o acesso é liberado automaticamente.</p>
        </div>
    `;
}

export function resetPasswordEmailTemplate(name: string, url: string) {
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #8c52ff;">Fluxy Gestão</h2>
            <p>Olá, ${name}!</p>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>
            <p>
                <a href="${url}" style="background: #8c52ff; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Redefinir senha
                </a>
            </p>
            <p style="color: #666; font-size: 12px;">Se você não solicitou esta troca, ignore este e-mail. O link expira em 1 hora.</p>
        </div>
    `;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]!);
}

export function ticketUpdateEmailTemplate(name: string, ticketNumber: number, subject: string, message: string, url: string) {
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #8c52ff;">Fluxy Gestão</h2>
            <p>Olá, ${escapeHtml(name)}!</p>
            <p>${escapeHtml(message)}</p>
            <p style="background: #f4f0ff; padding: 12px; border-radius: 8px;"><strong>Ticket #${ticketNumber}</strong> — ${escapeHtml(subject)}</p>
            <p>
                <a href="${url}" style="background: #8c52ff; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Ver atendimento
                </a>
            </p>
        </div>
    `;
}

export function newTicketAdminEmailTemplate(ticketNumber: number, severity: string, subject: string, screen: string, userLabel: string, url: string) {
    return `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #8c52ff;">Fluxy Gestão — Suporte</h2>
            <p>Novo ticket <strong>#${ticketNumber}</strong> (${severity}) aberto por ${escapeHtml(userLabel)}.</p>
            <p><strong>Assunto:</strong> ${escapeHtml(subject)}<br/><strong>Tela:</strong> ${escapeHtml(screen)}</p>
            <p>
                <a href="${url}" style="background: #8c52ff; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
                    Abrir ticket
                </a>
            </p>
        </div>
    `;
}
