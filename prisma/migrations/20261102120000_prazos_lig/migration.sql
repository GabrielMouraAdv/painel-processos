-- Prazos TCE/Improbidade vindos da planilha da triagem LIG (somente tabelas novas)
-- CreateTable
CREATE TABLE "PrazoLig" (
    "idPlanilha" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT '',
    "lancadoLegalOne" TEXT NOT NULL DEFAULT '',
    "prazoInternoTexto" TEXT NOT NULL DEFAULT '',
    "prazoInterno" TIMESTAMP(3),
    "prazoFatalTexto" TEXT NOT NULL DEFAULT '',
    "prazoFatal" TIMESTAMP(3),
    "peca" TEXT NOT NULL DEFAULT '',
    "prazoContagem" TEXT NOT NULL DEFAULT '',
    "fundamento" TEXT NOT NULL DEFAULT '',
    "numeroProcesso" TEXT NOT NULL DEFAULT '',
    "orgao" TEXT NOT NULL DEFAULT '',
    "cliente" TEXT NOT NULL DEFAULT '',
    "parteInteressada" TEXT NOT NULL DEFAULT '',
    "atoPublicado" TEXT NOT NULL DEFAULT '',
    "diarioEdicao" TEXT NOT NULL DEFAULT '',
    "dataPublicacaoTexto" TEXT NOT NULL DEFAULT '',
    "dataPublicacao" TIMESTAMP(3),
    "primeiroDiaTexto" TEXT NOT NULL DEFAULT '',
    "primeiroDia" TIMESTAMP(3),
    "origemLig" TEXT NOT NULL DEFAULT '',
    "nomePesquisado" TEXT NOT NULL DEFAULT '',
    "observacoes" TEXT NOT NULL DEFAULT '',
    "linkEmail" TEXT NOT NULL DEFAULT '',
    "pubId" TEXT NOT NULL DEFAULT '',
    "textoPublicacao" TEXT NOT NULL DEFAULT '',
    "linhaPlanilha" INTEGER NOT NULL DEFAULT 0,
    "ativoNaPlanilha" BOOLEAN NOT NULL DEFAULT true,
    "sincronizadoEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrazoLig_pkey" PRIMARY KEY ("idPlanilha")
);

-- CreateTable
CREATE TABLE "PublicacaoLig" (
    "pubId" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL DEFAULT '',
    "diarioEdicao" TEXT NOT NULL DEFAULT '',
    "dataPublicacaoTexto" TEXT NOT NULL DEFAULT '',
    "dataPublicacao" TIMESTAMP(3),
    "origemLig" TEXT NOT NULL DEFAULT '',
    "prazosLigados" TEXT NOT NULL DEFAULT '',
    "texto" TEXT NOT NULL DEFAULT '',
    "inteiroTeorUrl" TEXT NOT NULL DEFAULT '',
    "linhaPlanilha" INTEGER NOT NULL DEFAULT 0,
    "ativoNaPlanilha" BOOLEAN NOT NULL DEFAULT true,
    "sincronizadoEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicacaoLig_pkey" PRIMARY KEY ("pubId")
);

-- CreateTable
CREATE TABLE "ConferenciaLig" (
    "idMensagem" TEXT NOT NULL,
    "dataDiarioTexto" TEXT NOT NULL DEFAULT '',
    "dataDiario" TIMESTAMP(3),
    "diario" TEXT NOT NULL DEFAULT '',
    "assinatura" TEXT NOT NULL DEFAULT '',
    "totalInformado" TEXT NOT NULL DEFAULT '',
    "publicacoesExtraidas" TEXT NOT NULL DEFAULT '',
    "bate" TEXT NOT NULL DEFAULT '',
    "excluidas" TEXT NOT NULL DEFAULT '',
    "noEscopo" TEXT NOT NULL DEFAULT '',
    "prazosGerados" TEXT NOT NULL DEFAULT '',
    "conferidoEm" TEXT NOT NULL DEFAULT '',
    "linhaPlanilha" INTEGER NOT NULL DEFAULT 0,
    "ativoNaPlanilha" BOOLEAN NOT NULL DEFAULT true,
    "sincronizadoEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConferenciaLig_pkey" PRIMARY KEY ("idMensagem")
);

-- CreateTable
CREATE TABLE "CienciaLig" (
    "numeroProcesso" TEXT NOT NULL,
    "dataPublicacaoTexto" TEXT NOT NULL,
    "dataPublicacao" TIMESTAMP(3),
    "orgao" TEXT NOT NULL DEFAULT '',
    "cliente" TEXT NOT NULL DEFAULT '',
    "atoPublicado" TEXT NOT NULL DEFAULT '',
    "motivo" TEXT NOT NULL DEFAULT '',
    "origemLig" TEXT NOT NULL DEFAULT '',
    "nomePesquisado" TEXT NOT NULL DEFAULT '',
    "linkEmail" TEXT NOT NULL DEFAULT '',
    "linhaPlanilha" INTEGER NOT NULL DEFAULT 0,
    "ativoNaPlanilha" BOOLEAN NOT NULL DEFAULT true,
    "sincronizadoEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CienciaLig_pkey" PRIMARY KEY ("numeroProcesso","dataPublicacaoTexto")
);

-- CreateTable
CREATE TABLE "SyncPrazosLig" (
    "id" TEXT NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),
    "arquivo" TEXT,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "erro" TEXT,
    "linhasPrazos" INTEGER NOT NULL DEFAULT 0,
    "linhasPublicacoes" INTEGER NOT NULL DEFAULT 0,
    "linhasConferencia" INTEGER NOT NULL DEFAULT 0,
    "linhasCiencia" INTEGER NOT NULL DEFAULT 0,
    "inativados" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SyncPrazosLig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrazoLig_ativoNaPlanilha_idx" ON "PrazoLig"("ativoNaPlanilha");

-- CreateIndex
CREATE INDEX "PrazoLig_pubId_idx" ON "PrazoLig"("pubId");

-- CreateIndex
CREATE INDEX "ConferenciaLig_ativoNaPlanilha_idx" ON "ConferenciaLig"("ativoNaPlanilha");

-- CreateIndex
CREATE INDEX "CienciaLig_ativoNaPlanilha_idx" ON "CienciaLig"("ativoNaPlanilha");

-- CreateIndex
CREATE INDEX "SyncPrazosLig_ok_concluidoEm_idx" ON "SyncPrazosLig"("ok", "concluidoEm");

