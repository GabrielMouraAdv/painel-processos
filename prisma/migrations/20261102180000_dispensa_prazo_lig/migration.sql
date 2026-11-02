-- Dispensa de prazos da planilha LIG feita no painel (somente tabela nova)
CREATE TABLE "DispensaPrazoLig" (
    "id" TEXT NOT NULL,
    "idPlanilha" TEXT NOT NULL,
    "numeroProcesso" TEXT NOT NULL,
    "peca" TEXT NOT NULL,
    "prazoFatalTexto" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desfeitaEm" TIMESTAMP(3),
    "desfeitaPorNome" TEXT,

    CONSTRAINT "DispensaPrazoLig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DispensaPrazoLig_idPlanilha_idx" ON "DispensaPrazoLig"("idPlanilha");
