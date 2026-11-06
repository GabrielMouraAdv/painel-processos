-- Coletor do e-TCEPE: so cria as duas tabelas novas.
-- ATENCAO: o diff do Prisma propunha DROP TABLE de oab_app, oab_bank,
-- oab_trainer_progress e radar_leads (outros projetos no mesmo banco). Removido.

-- CreateTable
CREATE TABLE "ColetaEtce" (
    "id" TEXT NOT NULL,
    "numeroBase" TEXT NOT NULL,
    "verificadoEm" TIMESTAMP(3),
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "erro" TEXT,
    "falhasSeguidas" INTEGER NOT NULL DEFAULT 0,
    "cabecalho" TEXT,
    "tarefasAbertas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deliberacoes" JSONB,
    "documentos" JSONB,
    "movimentacoes" JSONB,
    "recursos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColetaEtce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoEtce" (
    "id" TEXT NOT NULL,
    "numeroBase" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'OUTRO',
    "chave" TEXT NOT NULL,
    "data" TIMESTAMP(3),
    "descricao" TEXT NOT NULL,
    "linhaDeBase" BOOLEAN NOT NULL DEFAULT false,
    "detectadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "analiseIa" JSONB,
    "analisadoEm" TIMESTAMP(3),
    "analiseErro" TEXT,

    CONSTRAINT "EventoEtce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColetaEtce_numeroBase_key" ON "ColetaEtce"("numeroBase");

-- CreateIndex
CREATE INDEX "ColetaEtce_verificadoEm_idx" ON "ColetaEtce"("verificadoEm");

-- CreateIndex
CREATE INDEX "EventoEtce_detectadoEm_idx" ON "EventoEtce"("detectadoEm");

-- CreateIndex
CREATE INDEX "EventoEtce_tipo_analisadoEm_idx" ON "EventoEtce"("tipo", "analisadoEm");

-- CreateIndex
CREATE INDEX "EventoEtce_numeroBase_categoria_idx" ON "EventoEtce"("numeroBase", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "EventoEtce_numeroBase_tipo_chave_key" ON "EventoEtce"("numeroBase", "tipo", "chave");

