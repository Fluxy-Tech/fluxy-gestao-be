-- Comunidade (anúncios do admin + leitura por usuário) e Suporte (tickets S1/S2/S3,
-- histórico de mensagens e anexos privados).

-- CreateEnum
CREATE TYPE "AnnouncementKind" AS ENUM ('INFO', 'NEWS', 'WARNING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TicketSeverity" AS ENUM ('S1', 'S2', 'S3');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketAuthorRole" AS ENUM ('USER', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "AnnouncementKind" NOT NULL DEFAULT 'INFO',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_read" (
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_read_pkey" PRIMARY KEY ("announcementId","userId")
);

-- CreateTable
CREATE TABLE "ticket" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "screen" TEXT NOT NULL,
    "severity" "TicketSeverity" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageBy" "TicketAuthorRole" NOT NULL DEFAULT 'USER',
    "userReadAt" TIMESTAMP(3),
    "adminReadAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_message" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorRole" "TicketAuthorRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_attachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "messageId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcement_published_publishedAt_idx" ON "announcement"("published", "publishedAt");

-- CreateIndex
CREATE INDEX "announcement_read_userId_idx" ON "announcement_read"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_number_key" ON "ticket"("number");

-- CreateIndex
CREATE INDEX "ticket_userId_idx" ON "ticket"("userId");

-- CreateIndex
CREATE INDEX "ticket_status_severity_idx" ON "ticket"("status", "severity");

-- CreateIndex
CREATE INDEX "ticket_lastMessageAt_idx" ON "ticket"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ticket_message_ticketId_createdAt_idx" ON "ticket_message"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "ticket_attachment_ticketId_idx" ON "ticket_attachment"("ticketId");

-- AddForeignKey
ALTER TABLE "announcement_read" ADD CONSTRAINT "announcement_read_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_read" ADD CONSTRAINT "announcement_read_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachment" ADD CONSTRAINT "ticket_attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachment" ADD CONSTRAINT "ticket_attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ticket_message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

