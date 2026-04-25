-- CreateEnum
CREATE TYPE "TipoInteressado" AS ENUM ('PESSOA_FISICA', 'PESSOA_JURIDICA');

-- AlterTable
ALTER TABLE "Gestor" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "nomeFantasia" TEXT,
ADD COLUMN     "ramoAtividade" TEXT,
ADD COLUMN     "razaoSocial" TEXT,
ADD COLUMN     "tipoInteressado" "TipoInteressado" NOT NULL DEFAULT 'PESSOA_FISICA';

-- CreateTable
CREATE TABLE "GestorMunicipio" (
    "id" TEXT NOT NULL,
    "gestorId" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GestorMunicipio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GestorMunicipio_municipioId_idx" ON "GestorMunicipio"("municipioId");

-- CreateIndex
CREATE UNIQUE INDEX "GestorMunicipio_gestorId_municipioId_key" ON "GestorMunicipio"("gestorId", "municipioId");

-- CreateIndex
CREATE INDEX "Gestor_tipoInteressado_idx" ON "Gestor"("tipoInteressado");

-- AddForeignKey
ALTER TABLE "GestorMunicipio" ADD CONSTRAINT "GestorMunicipio_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "Gestor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GestorMunicipio" ADD CONSTRAINT "GestorMunicipio_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
