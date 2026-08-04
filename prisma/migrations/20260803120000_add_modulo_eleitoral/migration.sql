-- CreateEnum
CREATE TYPE "ClasseEleitoral" AS ENUM ('REPRESENTACAO', 'AIJE', 'AIME', 'PETICAO', 'MANDADO_SEGURANCA', 'RECURSO', 'OUTRO');

-- CreateEnum
CREATE TYPE "PoloEleitoral" AS ENUM ('ATIVO', 'PASSIVO');

-- CreateEnum
CREATE TYPE "StatusEleitoral" AS ENUM ('EM_TRAMITACAO', 'JULGADO', 'ARQUIVADO');

-- CreateTable
CREATE TABLE "ProcessoEleitoral" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "classe" "ClasseEleitoral" NOT NULL DEFAULT 'REPRESENTACAO',
    "apelido" TEXT,
    "parteAutora" TEXT NOT NULL,
    "parteRe" TEXT NOT NULL,
    "polo" "PoloEleitoral" NOT NULL DEFAULT 'PASSIVO',
    "objeto" TEXT NOT NULL,
    "relator" TEXT,
    "status" "StatusEleitoral" NOT NULL DEFAULT 'EM_TRAMITACAO',
    "resultado" TEXT,
    "observacoes" TEXT,
    "coordenadorId" TEXT,
    "advogadoRespId" TEXT,
    "datajudClasse" TEXT,
    "datajudOrgao" TEXT,
    "ultimaConsultaDatajud" TIMESTAMP(3),
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessoEleitoral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrazoEleitoral" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tarefa" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "hora" TEXT,
    "observacoes" TEXT,
    "cumprido" BOOLEAN NOT NULL DEFAULT false,
    "responsavelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrazoEleitoral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentoEleitoral" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "codigo" TEXT,
    "nome" TEXT NOT NULL,
    "complemento" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoEleitoral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatorioEleitoral" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "dataReferencia" TIMESTAMP(3) NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "observacoes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelatorioEleitoral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessoEleitoral_numero_key" ON "ProcessoEleitoral"("numero");

-- CreateIndex
CREATE INDEX "ProcessoEleitoral_escritorioId_idx" ON "ProcessoEleitoral"("escritorioId");

-- CreateIndex
CREATE INDEX "ProcessoEleitoral_status_idx" ON "ProcessoEleitoral"("status");

-- CreateIndex
CREATE INDEX "ProcessoEleitoral_coordenadorId_idx" ON "ProcessoEleitoral"("coordenadorId");

-- CreateIndex
CREATE INDEX "ProcessoEleitoral_advogadoRespId_idx" ON "ProcessoEleitoral"("advogadoRespId");

-- CreateIndex
CREATE INDEX "PrazoEleitoral_processoId_idx" ON "PrazoEleitoral"("processoId");

-- CreateIndex
CREATE INDEX "PrazoEleitoral_data_idx" ON "PrazoEleitoral"("data");

-- CreateIndex
CREATE INDEX "PrazoEleitoral_cumprido_idx" ON "PrazoEleitoral"("cumprido");

-- CreateIndex
CREATE INDEX "PrazoEleitoral_responsavelId_idx" ON "PrazoEleitoral"("responsavelId");

-- CreateIndex
CREATE INDEX "MovimentoEleitoral_processoId_idx" ON "MovimentoEleitoral"("processoId");

-- CreateIndex
CREATE INDEX "MovimentoEleitoral_dataHora_idx" ON "MovimentoEleitoral"("dataHora");

-- CreateIndex
CREATE INDEX "MovimentoEleitoral_lida_idx" ON "MovimentoEleitoral"("lida");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentoEleitoral_processoId_dataHora_nome_key" ON "MovimentoEleitoral"("processoId", "dataHora", "nome");

-- CreateIndex
CREATE INDEX "RelatorioEleitoral_escritorioId_idx" ON "RelatorioEleitoral"("escritorioId");

-- CreateIndex
CREATE INDEX "RelatorioEleitoral_dataReferencia_idx" ON "RelatorioEleitoral"("dataReferencia");

-- AddForeignKey
ALTER TABLE "ProcessoEleitoral" ADD CONSTRAINT "ProcessoEleitoral_coordenadorId_fkey" FOREIGN KEY ("coordenadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoEleitoral" ADD CONSTRAINT "ProcessoEleitoral_advogadoRespId_fkey" FOREIGN KEY ("advogadoRespId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoEleitoral" ADD CONSTRAINT "ProcessoEleitoral_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrazoEleitoral" ADD CONSTRAINT "PrazoEleitoral_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "ProcessoEleitoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrazoEleitoral" ADD CONSTRAINT "PrazoEleitoral_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoEleitoral" ADD CONSTRAINT "MovimentoEleitoral_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "ProcessoEleitoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatorioEleitoral" ADD CONSTRAINT "RelatorioEleitoral_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatorioEleitoral" ADD CONSTRAINT "RelatorioEleitoral_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

