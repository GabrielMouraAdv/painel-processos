-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramAtivo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telegramBotToken" TEXT,
ADD COLUMN     "telegramBotUsername" TEXT,
ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramHorarioLembreteManha" TEXT DEFAULT '07:00',
ADD COLUMN     "telegramHorarioLembreteTarde" TEXT DEFAULT '18:00',
ADD COLUMN     "telegramReceberLembreteDiario" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "User_telegramAtivo_idx" ON "User"("telegramAtivo");
