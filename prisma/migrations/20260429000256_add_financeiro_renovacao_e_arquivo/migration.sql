-- AlterTable
ALTER TABLE "ContratoMunicipal" ADD COLUMN     "dataRenovacao" TIMESTAMP(3),
ADD COLUMN     "diasAvisoRenovacao" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "observacoesRenovacao" TEXT;

-- AlterTable
ALTER TABLE "NotaFiscal" ADD COLUMN     "arquivoNome" TEXT,
ADD COLUMN     "arquivoTipo" TEXT,
ADD COLUMN     "arquivoUrl" TEXT;

-- CreateIndex
CREATE INDEX "ContratoMunicipal_dataRenovacao_idx" ON "ContratoMunicipal"("dataRenovacao");
