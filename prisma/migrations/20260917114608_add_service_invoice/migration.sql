-- CreateEnum
CREATE TYPE "ServiceInvoiceStatus" AS ENUM ('ISSUED', 'SETTLED', 'CANCELED');

-- AlterTable
ALTER TABLE "client" ADD COLUMN     "noteSequence" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "serviceInvoiceId" TEXT;

-- CreateTable
CREATE TABLE "service_invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "number" BIGINT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "ServiceInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "settledAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_invoice_userId_idx" ON "service_invoice"("userId");

-- CreateIndex
CREATE INDEX "service_invoice_clientId_idx" ON "service_invoice"("clientId");

-- CreateIndex
CREATE INDEX "service_invoice_status_idx" ON "service_invoice"("status");

-- CreateIndex
CREATE INDEX "service_invoice_issueDate_idx" ON "service_invoice"("issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "service_invoice_clientId_number_key" ON "service_invoice"("clientId", "number");

-- CreateIndex
CREATE INDEX "order_serviceInvoiceId_idx" ON "order"("serviceInvoiceId");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_serviceInvoiceId_fkey" FOREIGN KEY ("serviceInvoiceId") REFERENCES "service_invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoice" ADD CONSTRAINT "service_invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_invoice" ADD CONSTRAINT "service_invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
