-- Imagens dos anúncios da Comunidade (carrossel).

-- AlterTable
ALTER TABLE "announcement" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
