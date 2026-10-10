-- Desconto/acréscimo passam a ser gerais da OS (em R$, sobre a soma dos itens), em vez de
-- por item. As OS existentes ficam com 0: o desconto/acréscimo por item delas continua
-- embutido no finalPrice de cada item, então o totalSale não muda.

-- AlterTable
ALTER TABLE "order" ADD COLUMN "discount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "order" ADD COLUMN "increase" DECIMAL(14,2) NOT NULL DEFAULT 0;
