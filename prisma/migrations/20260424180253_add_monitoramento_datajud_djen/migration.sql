-- CreateTable
CREATE TABLE "MovimentacaoAutomatica" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "codigoMovimento" TEXT,
    "nomeMovimento" TEXT NOT NULL,
    "descricao" TEXT,
    "dataMovimento" TIMESTAMP(3) NOT NULL,
    "complementos" TEXT,
    "fonte" TEXT NOT NULL DEFAULT 'DATAJUD',
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoAutomatica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicacaoDJEN" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "dataPublicacao" TIMESTAMP(3) NOT NULL,
    "dataDisponibilizacao" TIMESTAMP(3),
    "conteudo" TEXT,
    "caderno" TEXT,
    "pagina" TEXT,
    "fonte" TEXT NOT NULL DEFAULT 'DJEN',
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "geraIntimacao" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicacaoDJEN_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoramentoConfig" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "monitoramentoAtivo" BOOLEAN NOT NULL DEFAULT true,
    "ultimaVerificacao" TIMESTAMP(3),
    "ultimoErro" TEXT,
    "totalVerificacoes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoramentoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimentacaoAutomatica_processoId_lida_idx" ON "MovimentacaoAutomatica"("processoId", "lida");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoAutomatica_processoId_dataMovimento_nomeMovimen_key" ON "MovimentacaoAutomatica"("processoId", "dataMovimento", "nomeMovimento");

-- CreateIndex
CREATE INDEX "PublicacaoDJEN_processoId_lida_idx" ON "PublicacaoDJEN"("processoId", "lida");

-- CreateIndex
CREATE UNIQUE INDEX "PublicacaoDJEN_processoId_dataPublicacao_conteudo_key" ON "PublicacaoDJEN"("processoId", "dataPublicacao", "conteudo");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoramentoConfig_processoId_key" ON "MonitoramentoConfig"("processoId");

-- AddForeignKey
ALTER TABLE "MovimentacaoAutomatica" ADD CONSTRAINT "MovimentacaoAutomatica_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicacaoDJEN" ADD CONSTRAINT "PublicacaoDJEN_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoramentoConfig" ADD CONSTRAINT "MonitoramentoConfig_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
