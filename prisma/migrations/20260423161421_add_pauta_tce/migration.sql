-- CreateTable
CREATE TABLE "SessaoPauta" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "camara" "CamaraTce" NOT NULL,
    "observacoesGerais" TEXT,
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessaoPauta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPauta" (
    "id" TEXT NOT NULL,
    "sessaoId" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL,
    "tituloProcesso" TEXT,
    "municipio" TEXT NOT NULL,
    "exercicio" TEXT,
    "relator" TEXT NOT NULL,
    "advogadoResp" TEXT NOT NULL,
    "situacao" TEXT,
    "observacoes" TEXT,
    "prognostico" TEXT,
    "providencia" TEXT,
    "retiradoDePauta" BOOLEAN NOT NULL DEFAULT false,
    "pedidoVistas" BOOLEAN NOT NULL DEFAULT false,
    "conselheiroVistas" TEXT,
    "processoTceId" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemPauta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessaoPauta_escritorioId_data_idx" ON "SessaoPauta"("escritorioId", "data");

-- CreateIndex
CREATE INDEX "ItemPauta_sessaoId_idx" ON "ItemPauta"("sessaoId");

-- CreateIndex
CREATE INDEX "ItemPauta_processoTceId_idx" ON "ItemPauta"("processoTceId");

-- AddForeignKey
ALTER TABLE "SessaoPauta" ADD CONSTRAINT "SessaoPauta_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPauta" ADD CONSTRAINT "ItemPauta_sessaoId_fkey" FOREIGN KEY ("sessaoId") REFERENCES "SessaoPauta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPauta" ADD CONSTRAINT "ItemPauta_processoTceId_fkey" FOREIGN KEY ("processoTceId") REFERENCES "ProcessoTce"("id") ON DELETE SET NULL ON UPDATE CASCADE;
