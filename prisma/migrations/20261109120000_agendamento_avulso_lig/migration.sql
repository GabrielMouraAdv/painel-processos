-- CreateTable: agendamento avulso da aba "Agendamento de publicacoes" (so CREATE)
CREATE TABLE "AgendamentoAvulsoLig" (
    "id" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL,
    "cliente" TEXT NOT NULL DEFAULT '',
    "orgao" TEXT NOT NULL DEFAULT '',
    "peca" TEXT NOT NULL,
    "prazo" TEXT NOT NULL DEFAULT '',
    "dataAgenda" TEXT NOT NULL,
    "prazoFatalTexto" TEXT NOT NULL DEFAULT '',
    "observacoes" TEXT NOT NULL DEFAULT '',
    "textoPublicacao" TEXT NOT NULL DEFAULT '',
    "usuarioId" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),
    "concluidoPor" TEXT,

    CONSTRAINT "AgendamentoAvulsoLig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgendamentoAvulsoLig_concluidoEm_idx" ON "AgendamentoAvulsoLig"("concluidoEm");
