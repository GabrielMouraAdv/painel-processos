-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ADVOGADO', 'SECRETARIA', 'LEITURA');

-- CreateEnum
CREATE TYPE "TipoProcesso" AS ENUM ('IMPROBIDADE', 'ACP', 'CRIMINAL');

-- CreateEnum
CREATE TYPE "Tribunal" AS ENUM ('TJPE', 'TRF5', 'TRF1', 'STJ', 'STF', 'OUTRO');

-- CreateEnum
CREATE TYPE "Grau" AS ENUM ('PRIMEIRO', 'SEGUNDO', 'SUPERIOR');

-- CreateEnum
CREATE TYPE "Risco" AS ENUM ('ALTO', 'MEDIO', 'BAIXO');

-- CreateTable
CREATE TABLE "Escritorio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escritorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'LEITURA',
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gestor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "observacoes" TEXT,
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gestor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Processo" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "TipoProcesso" NOT NULL,
    "tribunal" "Tribunal" NOT NULL,
    "juizo" TEXT NOT NULL,
    "grau" "Grau" NOT NULL,
    "fase" TEXT NOT NULL,
    "resultado" TEXT,
    "risco" "Risco" NOT NULL,
    "valor" DECIMAL(15,2),
    "dataDistribuicao" TIMESTAMP(3) NOT NULL,
    "objeto" TEXT NOT NULL,
    "gestorId" TEXT NOT NULL,
    "advogadoId" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Andamento" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "grau" "Grau" NOT NULL,
    "fase" TEXT NOT NULL,
    "resultado" TEXT,
    "texto" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Andamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prazo" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "hora" TEXT,
    "observacoes" TEXT,
    "cumprido" BOOLEAN NOT NULL DEFAULT false,
    "geradoAuto" BOOLEAN NOT NULL DEFAULT false,
    "origemFase" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Escritorio_cnpj_key" ON "Escritorio"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_escritorioId_idx" ON "User"("escritorioId");

-- CreateIndex
CREATE UNIQUE INDEX "Gestor_cpf_key" ON "Gestor"("cpf");

-- CreateIndex
CREATE INDEX "Gestor_escritorioId_idx" ON "Gestor"("escritorioId");

-- CreateIndex
CREATE UNIQUE INDEX "Processo_numero_key" ON "Processo"("numero");

-- CreateIndex
CREATE INDEX "Processo_escritorioId_idx" ON "Processo"("escritorioId");

-- CreateIndex
CREATE INDEX "Processo_gestorId_idx" ON "Processo"("gestorId");

-- CreateIndex
CREATE INDEX "Processo_advogadoId_idx" ON "Processo"("advogadoId");

-- CreateIndex
CREATE INDEX "Processo_tipo_idx" ON "Processo"("tipo");

-- CreateIndex
CREATE INDEX "Processo_risco_idx" ON "Processo"("risco");

-- CreateIndex
CREATE INDEX "Andamento_processoId_idx" ON "Andamento"("processoId");

-- CreateIndex
CREATE INDEX "Andamento_autorId_idx" ON "Andamento"("autorId");

-- CreateIndex
CREATE INDEX "Prazo_processoId_idx" ON "Prazo"("processoId");

-- CreateIndex
CREATE INDEX "Prazo_data_idx" ON "Prazo"("data");

-- CreateIndex
CREATE INDEX "Prazo_cumprido_idx" ON "Prazo"("cumprido");

-- CreateIndex
CREATE INDEX "Documento_processoId_idx" ON "Documento"("processoId");

-- CreateIndex
CREATE INDEX "Documento_uploadedBy_idx" ON "Documento"("uploadedBy");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gestor" ADD CONSTRAINT "Gestor_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "Gestor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Processo" ADD CONSTRAINT "Processo_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Andamento" ADD CONSTRAINT "Andamento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Andamento" ADD CONSTRAINT "Andamento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prazo" ADD CONSTRAINT "Prazo_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
