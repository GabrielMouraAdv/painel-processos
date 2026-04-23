-- CreateTable
CREATE TABLE "SessaoJudicial" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tribunal" TEXT NOT NULL,
    "orgaoJulgador" TEXT NOT NULL,
    "tipoSessao" TEXT NOT NULL DEFAULT 'presencial',
    "observacoesGerais" TEXT,
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessaoJudicial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPautaJudicial" (
    "id" TEXT NOT NULL,
    "sessaoId" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL,
    "tituloProcesso" TEXT,
    "tipoRecurso" TEXT,
    "partes" TEXT,
    "relator" TEXT NOT NULL,
    "advogadoResp" TEXT NOT NULL,
    "situacao" TEXT,
    "prognostico" TEXT,
    "observacoes" TEXT,
    "providencia" TEXT,
    "sustentacaoOral" BOOLEAN NOT NULL DEFAULT false,
    "advogadoSustentacao" TEXT,
    "sessaoVirtual" BOOLEAN NOT NULL DEFAULT false,
    "pedidoRetPresencial" BOOLEAN NOT NULL DEFAULT false,
    "retiradoDePauta" BOOLEAN NOT NULL DEFAULT false,
    "pedidoVistas" BOOLEAN NOT NULL DEFAULT false,
    "desPedidoVistas" TEXT,
    "processoId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemPautaJudicial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessaoJudicial_escritorioId_data_idx" ON "SessaoJudicial"("escritorioId", "data");

-- CreateIndex
CREATE INDEX "ItemPautaJudicial_sessaoId_idx" ON "ItemPautaJudicial"("sessaoId");

-- CreateIndex
CREATE INDEX "ItemPautaJudicial_processoId_idx" ON "ItemPautaJudicial"("processoId");

-- AddForeignKey
ALTER TABLE "SessaoJudicial" ADD CONSTRAINT "SessaoJudicial_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPautaJudicial" ADD CONSTRAINT "ItemPautaJudicial_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "SessaoJudicial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPautaJudicial" ADD CONSTRAINT "ItemPautaJudicial_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
