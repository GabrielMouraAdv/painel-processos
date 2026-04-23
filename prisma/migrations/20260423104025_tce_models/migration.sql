-- CreateEnum
CREATE TYPE "TipoProcessoTce" AS ENUM ('PRESTACAO_CONTAS_GOVERNO', 'PRESTACAO_CONTAS_GESTAO', 'AUDITORIA_ESPECIAL', 'RGF', 'AUTO_INFRACAO', 'MEDIDA_CAUTELAR');

-- CreateEnum
CREATE TYPE "CamaraTce" AS ENUM ('PRIMEIRA', 'SEGUNDA', 'PLENO');

-- CreateTable
CREATE TABLE "Municipio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "cnpjPrefeitura" TEXT,
    "observacoes" TEXT,
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Municipio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoGestao" (
    "id" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "gestorId" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoGestao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessoTce" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "TipoProcessoTce" NOT NULL,
    "municipioId" TEXT,
    "relator" TEXT,
    "camara" "CamaraTce" NOT NULL,
    "faseAtual" TEXT NOT NULL,
    "conselheiroSubstituto" TEXT,
    "notaTecnica" BOOLEAN NOT NULL DEFAULT false,
    "parecerMpco" BOOLEAN NOT NULL DEFAULT false,
    "despachadoComRelator" BOOLEAN NOT NULL DEFAULT false,
    "memorialPronto" BOOLEAN NOT NULL DEFAULT false,
    "exercicio" TEXT,
    "valorAutuado" DECIMAL(15,2),
    "objeto" TEXT NOT NULL,
    "dataAutuacao" TIMESTAMP(3),
    "dataIntimacao" TIMESTAMP(3),
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessoTce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteressadoProcessoTce" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "gestorId" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InteressadoProcessoTce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AndamentoTce" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "fase" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AndamentoTce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrazoTce" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataIntimacao" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "diasUteis" INTEGER NOT NULL,
    "prorrogavel" BOOLEAN NOT NULL DEFAULT true,
    "prorrogacaoPedida" BOOLEAN NOT NULL DEFAULT false,
    "dataProrrogacao" TIMESTAMP(3),
    "cumprido" BOOLEAN NOT NULL DEFAULT false,
    "advogadoRespId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrazoTce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Municipio_escritorioId_idx" ON "Municipio"("escritorioId");

-- CreateIndex
CREATE INDEX "HistoricoGestao_municipioId_idx" ON "HistoricoGestao"("municipioId");

-- CreateIndex
CREATE INDEX "HistoricoGestao_gestorId_idx" ON "HistoricoGestao"("gestorId");

-- CreateIndex
CREATE INDEX "ProcessoTce_escritorioId_idx" ON "ProcessoTce"("escritorioId");

-- CreateIndex
CREATE INDEX "ProcessoTce_municipioId_idx" ON "ProcessoTce"("municipioId");

-- CreateIndex
CREATE INDEX "ProcessoTce_tipo_idx" ON "ProcessoTce"("tipo");

-- CreateIndex
CREATE INDEX "ProcessoTce_camara_idx" ON "ProcessoTce"("camara");

-- CreateIndex
CREATE INDEX "InteressadoProcessoTce_processoId_idx" ON "InteressadoProcessoTce"("processoId");

-- CreateIndex
CREATE INDEX "InteressadoProcessoTce_gestorId_idx" ON "InteressadoProcessoTce"("gestorId");

-- CreateIndex
CREATE INDEX "AndamentoTce_processoId_idx" ON "AndamentoTce"("processoId");

-- CreateIndex
CREATE INDEX "AndamentoTce_autorId_idx" ON "AndamentoTce"("autorId");

-- CreateIndex
CREATE INDEX "PrazoTce_processoId_idx" ON "PrazoTce"("processoId");

-- CreateIndex
CREATE INDEX "PrazoTce_dataVencimento_idx" ON "PrazoTce"("dataVencimento");

-- CreateIndex
CREATE INDEX "PrazoTce_cumprido_idx" ON "PrazoTce"("cumprido");

-- CreateIndex
CREATE INDEX "PrazoTce_advogadoRespId_idx" ON "PrazoTce"("advogadoRespId");

-- AddForeignKey
ALTER TABLE "Municipio" ADD CONSTRAINT "Municipio_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoGestao" ADD CONSTRAINT "HistoricoGestao_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoGestao" ADD CONSTRAINT "HistoricoGestao_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "Gestor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoTce" ADD CONSTRAINT "ProcessoTce_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoTce" ADD CONSTRAINT "ProcessoTce_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteressadoProcessoTce" ADD CONSTRAINT "InteressadoProcessoTce_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "ProcessoTce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteressadoProcessoTce" ADD CONSTRAINT "InteressadoProcessoTce_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "Gestor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AndamentoTce" ADD CONSTRAINT "AndamentoTce_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "ProcessoTce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AndamentoTce" ADD CONSTRAINT "AndamentoTce_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrazoTce" ADD CONSTRAINT "PrazoTce_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "ProcessoTce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrazoTce" ADD CONSTRAINT "PrazoTce_advogadoRespId_fkey" FOREIGN KEY ("advogadoRespId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
