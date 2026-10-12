-- Saldo (crédito) do cliente: valor recebido a mais numa OS/nota (ou lançado à mão) fica
-- guardado em client.creditBalance, com extrato em client_credit_movement, e pode ser usado
-- para pagar OS/notas futuras. order/service_invoice.creditUsed guardam quanto do valor
-- pago veio do saldo, para a conciliação de caixa não contar esse dinheiro duas vezes.
-- Só adiciona colunas/tabela (com default) — nenhum dado existente muda.

-- CreateEnum
CREATE TYPE "ClientCreditType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "ClientCreditOrigin" AS ENUM ('OVERPAYMENT', 'MANUAL', 'PAYMENT', 'PAYMENT_REVERSAL');

-- AlterTable
ALTER TABLE "client" ADD COLUMN     "creditBalance" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "creditUsed" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "service_invoice" ADD COLUMN     "creditUsed" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "client_credit_movement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "type" "ClientCreditType" NOT NULL,
    "origin" "ClientCreditOrigin" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "orderId" TEXT,
    "serviceInvoiceId" TEXT,
    "affectsCash" BOOLEAN NOT NULL DEFAULT false,
    "cashCounted" BOOLEAN NOT NULL DEFAULT false,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_credit_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_credit_movement_userId_idx" ON "client_credit_movement"("userId");

-- CreateIndex
CREATE INDEX "client_credit_movement_clientId_idx" ON "client_credit_movement"("clientId");

-- AddForeignKey
ALTER TABLE "client_credit_movement" ADD CONSTRAINT "client_credit_movement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_credit_movement" ADD CONSTRAINT "client_credit_movement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_credit_movement" ADD CONSTRAINT "client_credit_movement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_credit_movement" ADD CONSTRAINT "client_credit_movement_serviceInvoiceId_fkey" FOREIGN KEY ("serviceInvoiceId") REFERENCES "service_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

