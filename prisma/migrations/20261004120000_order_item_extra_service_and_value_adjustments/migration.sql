-- Itens da OS passam a aceitar serviços extras (fora do catálogo) e o desconto/acréscimo
-- deixa de ser porcentagem e vira valor em R$ somado/subtraído do total do item.

-- AlterTable
ALTER TABLE "order_item" ALTER COLUMN "serviceId" DROP NOT NULL;
ALTER TABLE "order_item" ADD COLUMN "serviceName" TEXT;
ALTER TABLE "order_item" ALTER COLUMN "discount" SET DATA TYPE DECIMAL(14,2);
ALTER TABLE "order_item" ALTER COLUMN "increase" SET DATA TYPE DECIMAL(14,2);

-- Guarda o nome do serviço dos itens existentes
UPDATE "order_item" oi
SET "serviceName" = s."name"
FROM "service" s
WHERE oi."serviceId" = s.id;

-- Converte as porcentagens existentes em valores, mantendo o finalPrice igual:
-- antes: final = base * (1 + acr%) * (1 - desc%)
-- agora: final = base + acréscimo - desconto
UPDATE "order_item"
SET "increase" = ROUND("salePrice" * "quantity" * "increase" / 100, 2),
    "discount" = ROUND("salePrice" * "quantity" * (1 + "increase" / 100) * "discount" / 100, 2);
