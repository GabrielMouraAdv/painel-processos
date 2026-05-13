-- AlterTable
ALTER TABLE "Compromisso" ADD COLUMN     "escritorioResponsavelSlug" TEXT;

-- CreateIndex
CREATE INDEX "Compromisso_escritorioResponsavelSlug_idx" ON "Compromisso"("escritorioResponsavelSlug");
