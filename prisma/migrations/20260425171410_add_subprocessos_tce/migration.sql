-- CreateEnum
CREATE TYPE "TipoRecursoTce" AS ENUM ('RECURSO_ORDINARIO', 'EMBARGOS_DECLARACAO', 'AGRAVO', 'AGRAVO_REGIMENTAL', 'PEDIDO_RESCISAO_RECURSO', 'PEDIDO_SUSPENSAO_CAUTELAR');

-- CreateTable
CREATE TABLE "SubprocessoTce" (
    "id" TEXT NOT NULL,
    "processoPaiId" TEXT NOT NULL,
    "subprocessoPaiId" TEXT,
    "numero" TEXT NOT NULL,
    "tipoRecurso" "TipoRecursoTce" NOT NULL,
    "numeroSequencial" INTEGER NOT NULL,
    "dataInterposicao" TIMESTAMP(3) NOT NULL,
    "dataIntimacao" TIMESTAMP(3),
    "fase" TEXT NOT NULL,
    "relator" TEXT,
    "decisao" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubprocessoTce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrazoSubprocessoTce" (
    "id" TEXT NOT NULL,
    "subprocessoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dataIntimacao" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "diasUteis" INTEGER NOT NULL,
    "prorrogavel" BOOLEAN NOT NULL DEFAULT true,
    "prorrogacaoPedida" BOOLEAN NOT NULL DEFAULT false,
    "cumprido" BOOLEAN NOT NULL DEFAULT false,
    "advogadoRespId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrazoSubprocessoTce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AndamentoSubprocessoTce" (
    "id" TEXT NOT NULL,
    "subprocessoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "fase" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AndamentoSubprocessoTce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoSubprocessoTce" (
    "id" TEXT NOT NULL,
    "subprocessoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoSubprocessoTce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubprocessoTce_processoPaiId_idx" ON "SubprocessoTce"("processoPaiId");

-- CreateIndex
CREATE INDEX "SubprocessoTce_subprocessoPaiId_idx" ON "SubprocessoTce"("subprocessoPaiId");

-- CreateIndex
CREATE INDEX "PrazoSubprocessoTce_subprocessoId_idx" ON "PrazoSubprocessoTce"("subprocessoId");

-- CreateIndex
CREATE INDEX "PrazoSubprocessoTce_dataVencimento_idx" ON "PrazoSubprocessoTce"("dataVencimento");

-- CreateIndex
CREATE INDEX "PrazoSubprocessoTce_cumprido_idx" ON "PrazoSubprocessoTce"("cumprido");

-- CreateIndex
CREATE INDEX "AndamentoSubprocessoTce_subprocessoId_idx" ON "AndamentoSubprocessoTce"("subprocessoId");

-- CreateIndex
CREATE INDEX "DocumentoSubprocessoTce_subprocessoId_idx" ON "DocumentoSubprocessoTce"("subprocessoId");

-- AddForeignKey
ALTER TABLE "SubprocessoTce" ADD CONSTRAINT "SubprocessoTce_processoPaiId_fkey" FOREIGN KEY ("processoPaiId") REFERENCES "ProcessoTce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubprocessoTce" ADD CONSTRAINT "SubprocessoTce_subprocessoPaiId_fkey" FOREIGN KEY ("subprocessoPaiId") REFERENCES "SubprocessoTce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrazoSubprocessoTce" ADD CONSTRAINT "PrazoSubprocessoTce_subprocessoId_fkey" FOREIGN KEY ("subprocessoId") REFERENCES "SubprocessoTce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AndamentoSubprocessoTce" ADD CONSTRAINT "AndamentoSubprocessoTce_subprocessoId_fkey" FOREIGN KEY ("subprocessoId") REFERENCES "SubprocessoTce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoSubprocessoTce" ADD CONSTRAINT "DocumentoSubprocessoTce_subprocessoId_fkey" FOREIGN KEY ("subprocessoId") REFERENCES "SubprocessoTce"("id") ON DELETE CASCADE ON UPDATE CASCADE;
