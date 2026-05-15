-- AlterTable
ALTER TABLE "MovimentacaoAutomatica"
  ADD COLUMN "conteudoIntegral" TEXT,
  ADD COLUMN "conteudoIntegralBuscadoEm" TIMESTAMP(3),
  ADD COLUMN "conteudoIntegralStatus" TEXT,
  ADD COLUMN "djenIdPublicacao" TEXT,
  ADD COLUMN "djenLinkOficial" TEXT;

-- CreateIndex
CREATE INDEX "MovimentacaoAutomatica_conteudoIntegralStatus_idx"
  ON "MovimentacaoAutomatica"("conteudoIntegralStatus");
