-- AlterTable
ALTER TABLE "Prazo" ADD COLUMN     "advogadoRedatorId" TEXT;

-- CreateIndex
CREATE INDEX "Prazo_advogadoRedatorId_idx" ON "Prazo"("advogadoRedatorId");

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_advogadoRedatorId_fkey" FOREIGN KEY ("advogadoRedatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
