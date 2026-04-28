-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('MUNICIPIO', 'PESSOA_FISICA');

-- CreateEnum
CREATE TYPE "StatusNota" AS ENUM ('A_VENCER', 'PAGA', 'VENCIDA', 'EM_ATRASO');

-- CreateEnum
CREATE TYPE "TipoHonorario" AS ENUM ('CONTRATUAL_MENSAL', 'POR_CAUSA', 'SUCUMBENCIA', 'OUTROS');

-- CreateTable
CREATE TABLE "ContratoMunicipal" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "bancasSlug" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "valorMensal" DECIMAL(15,2) NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContratoMunicipal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaFiscal" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "numeroNota" TEXT,
    "dataEmissao" TIMESTAMP(3),
    "mesReferencia" INTEGER NOT NULL,
    "anoReferencia" INTEGER NOT NULL,
    "valorNota" DECIMAL(15,2) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" TIMESTAMP(3),
    "valorPago" DECIMAL(15,2),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotaFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HonorarioPessoal" (
    "id" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "clienteCpf" TEXT,
    "bancasSlug" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tipoHonorario" "TipoHonorario" NOT NULL,
    "descricaoCausa" TEXT NOT NULL,
    "valorTotal" DECIMAL(15,2) NOT NULL,
    "dataContrato" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3),
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "dataPagamento" TIMESTAMP(3),
    "valorPago" DECIMAL(15,2),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HonorarioPessoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContratoMunicipal_municipioId_idx" ON "ContratoMunicipal"("municipioId");

-- CreateIndex
CREATE INDEX "ContratoMunicipal_ativo_idx" ON "ContratoMunicipal"("ativo");

-- CreateIndex
CREATE INDEX "NotaFiscal_contratoId_idx" ON "NotaFiscal"("contratoId");

-- CreateIndex
CREATE INDEX "NotaFiscal_anoReferencia_mesReferencia_idx" ON "NotaFiscal"("anoReferencia", "mesReferencia");

-- CreateIndex
CREATE INDEX "NotaFiscal_dataVencimento_idx" ON "NotaFiscal"("dataVencimento");

-- CreateIndex
CREATE INDEX "NotaFiscal_pago_idx" ON "NotaFiscal"("pago");

-- CreateIndex
CREATE INDEX "HonorarioPessoal_tipoHonorario_idx" ON "HonorarioPessoal"("tipoHonorario");

-- CreateIndex
CREATE INDEX "HonorarioPessoal_pago_idx" ON "HonorarioPessoal"("pago");

-- CreateIndex
CREATE INDEX "HonorarioPessoal_dataContrato_idx" ON "HonorarioPessoal"("dataContrato");

-- AddForeignKey
ALTER TABLE "ContratoMunicipal" ADD CONSTRAINT "ContratoMunicipal_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaFiscal" ADD CONSTRAINT "NotaFiscal_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "ContratoMunicipal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
