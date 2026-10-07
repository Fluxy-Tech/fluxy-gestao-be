-- Status de pagamento da nota fiscal (pendente / parcial / pago) e valor já pago.
-- Notas já baixadas (SETTLED) passam a constar como pagas integralmente.

-- AlterTable
ALTER TABLE "service_invoice" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0;

UPDATE "service_invoice"
SET "paymentStatus" = 'PAID', "amountPaid" = "totalAmount"
WHERE "status" = 'SETTLED';
