-- CreateTable: sugestao de agendamento da aba "Agendamento de publicacoes" (so CREATE)
CREATE TABLE "SugestaoAgendamentoLig" (
    "id" TEXT NOT NULL,
    "idPlanilha" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL,
    "prazoFatalTexto" TEXT NOT NULL,
    "agendamento" TEXT NOT NULL,
    "prazo" TEXT NOT NULL,
    "dataAgenda" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "substituidaEm" TIMESTAMP(3),

    CONSTRAINT "SugestaoAgendamentoLig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SugestaoAgendamentoLig_idPlanilha_idx" ON "SugestaoAgendamentoLig"("idPlanilha");
