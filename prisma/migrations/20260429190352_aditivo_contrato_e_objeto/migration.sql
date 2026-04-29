-- CreateEnum
CREATE TYPE "TipoAditivo" AS ENUM ('PRORROGACAO', 'REAJUSTE', 'ALTERACAO_OBJETO', 'ALTERACAO_VALOR', 'OUTRO');

-- AlterTable
ALTER TABLE "ContratoMunicipal" ADD COLUMN     "cargoRepresentante" TEXT,
ADD COLUMN     "cnpjContratante" TEXT,
ADD COLUMN     "numeroContrato" TEXT,
ADD COLUMN     "objetoDoContrato" TEXT,
ADD COLUMN     "orgaoContratante" TEXT,
ADD COLUMN     "representanteContratante" TEXT;

-- CreateTable
CREATE TABLE "AditivoContrato" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipo" "TipoAditivo" NOT NULL,
    "justificativa" TEXT NOT NULL,
    "fundamento" TEXT NOT NULL,
    "escritorioSlug" TEXT NOT NULL,
    "advogadoIdx" INTEGER NOT NULL DEFAULT 0,
    "arquivoUrl" TEXT,
    "arquivoNome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AditivoContrato_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AditivoContrato_contratoId_idx" ON "AditivoContrato"("contratoId");

-- CreateIndex
CREATE INDEX "AditivoContrato_createdAt_idx" ON "AditivoContrato"("createdAt");

-- AddForeignKey
ALTER TABLE "AditivoContrato" ADD CONSTRAINT "AditivoContrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "ContratoMunicipal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
