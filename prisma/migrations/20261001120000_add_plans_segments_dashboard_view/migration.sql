-- CreateTable
CREATE TABLE "plan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "maxClients" INTEGER,
    "maxServices" INTEGER,
    "maxOrdersPerMonth" INTEGER,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_slug_key" ON "plan"("slug");

-- Planos iniciais (valores e limites ajustáveis depois pelo painel admin). Limite NULL = sem limite.
INSERT INTO "plan" ("id", "slug", "name", "price", "maxClients", "maxServices", "maxOrdersPerMonth", "description", "sortOrder", "updatedAt") VALUES
    ('plan_bronze', 'bronze', 'Bronze', 19.99,   50,   50,  100, 'Acesso a todas as funcionalidades da plataforma', 1, CURRENT_TIMESTAMP),
    ('plan_prata',  'prata',  'Prata',  29.99,  150,  100,  300, 'Acesso a todas as funcionalidades da plataforma', 2, CURRENT_TIMESTAMP),
    ('plan_ouro',   'ouro',   'Ouro',   59.99, NULL, NULL, 1000, 'Acesso a todas as funcionalidades da plataforma', 3, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "businessSegment" TEXT,
ADD COLUMN     "dashboardView" TEXT,
ALTER COLUMN "plan" SET DEFAULT 'bronze';

-- Todos os usuários existentes (plano único "mensal", R$ 19,99) passam para o Bronze, que
-- mantém o mesmo valor.
UPDATE "user" SET "plan" = 'bronze';

-- Segmento inicial derivado da categoria que cada usuário já tinha escolhido.
UPDATE "user" SET "businessSegment" = CASE "businessCategory"
    WHEN 'HAIRDRESSER' THEN 'salao-de-beleza'
    WHEN 'LAB' THEN 'laboratorio-protese-dentaria'
    WHEN 'PETSHOP' THEN 'pet-shop'
    ELSE 'outros'
END;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_plan_fkey" FOREIGN KEY ("plan") REFERENCES "plan"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
