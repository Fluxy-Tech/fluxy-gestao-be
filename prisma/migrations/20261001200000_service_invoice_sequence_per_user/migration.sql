-- Numeração da nota fiscal de serviço passa a ser por empresa (User), não por cliente,
-- igual às OS. As notas já emitidas são renumeradas de 1..N por empresa, na ordem em
-- que foram criadas, e a sequência do usuário é posicionada no último número.

-- DropIndex
DROP INDEX "service_invoice_clientId_number_key";

-- AlterTable
ALTER TABLE "user" ADD COLUMN "invoiceSequence" BIGINT NOT NULL DEFAULT 0;

-- Renumeração das notas existentes
UPDATE "service_invoice" si
SET "number" = r.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt", id) AS rn
    FROM "service_invoice"
) r
WHERE si.id = r.id;

UPDATE "user" u
SET "invoiceSequence" = s.max_number
FROM (
    SELECT "userId", MAX("number") AS max_number
    FROM "service_invoice"
    GROUP BY "userId"
) s
WHERE u.id = s."userId";

-- AlterTable
ALTER TABLE "client" DROP COLUMN "noteSequence";

-- CreateIndex
CREATE UNIQUE INDEX "service_invoice_userId_number_key" ON "service_invoice"("userId", "number");
