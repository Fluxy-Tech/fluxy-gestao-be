-- Flag da agenda (página Calendário).

-- AlterTable
ALTER TABLE "user" ADD COLUMN "useCalendar" BOOLEAN NOT NULL DEFAULT false;

-- Quem já é de um ramo que agenda horário nas OS (Cabeleireiro/PetShop) continua vendo a agenda.
UPDATE "user" SET "useCalendar" = true WHERE "businessCategory" IN ('HAIRDRESSER', 'PETSHOP');
