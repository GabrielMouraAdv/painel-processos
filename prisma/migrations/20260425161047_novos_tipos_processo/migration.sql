-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoProcesso" ADD VALUE 'ACAO_POPULAR';
ALTER TYPE "TipoProcesso" ADD VALUE 'MANDADO_SEGURANCA';
ALTER TYPE "TipoProcesso" ADD VALUE 'MANDADO_SEGURANCA_COLETIVO';
ALTER TYPE "TipoProcesso" ADD VALUE 'HABEAS_CORPUS';
ALTER TYPE "TipoProcesso" ADD VALUE 'HABEAS_DATA';
ALTER TYPE "TipoProcesso" ADD VALUE 'ACAO_RESCISORIA';
ALTER TYPE "TipoProcesso" ADD VALUE 'EXECUCAO_FISCAL';
ALTER TYPE "TipoProcesso" ADD VALUE 'EXECUCAO_TITULO_EXTRAJUDICIAL';
ALTER TYPE "TipoProcesso" ADD VALUE 'CUMPRIMENTO_SENTENCA';
ALTER TYPE "TipoProcesso" ADD VALUE 'ACAO_ORDINARIA';
ALTER TYPE "TipoProcesso" ADD VALUE 'ACAO_DECLARATORIA';
ALTER TYPE "TipoProcesso" ADD VALUE 'ACAO_ANULATORIA';
ALTER TYPE "TipoProcesso" ADD VALUE 'EMBARGOS_EXECUCAO';
ALTER TYPE "TipoProcesso" ADD VALUE 'EMBARGOS_TERCEIRO';
ALTER TYPE "TipoProcesso" ADD VALUE 'RECLAMACAO';
ALTER TYPE "TipoProcesso" ADD VALUE 'CONFLITO_COMPETENCIA';
ALTER TYPE "TipoProcesso" ADD VALUE 'MEDIDA_CAUTELAR';
ALTER TYPE "TipoProcesso" ADD VALUE 'TUTELA_CAUTELAR_ANTECEDENTE';
ALTER TYPE "TipoProcesso" ADD VALUE 'PROCEDIMENTO_COMUM';
ALTER TYPE "TipoProcesso" ADD VALUE 'JUIZADO_ESPECIAL';
ALTER TYPE "TipoProcesso" ADD VALUE 'OUTRO';

-- AlterTable
ALTER TABLE "Processo" ADD COLUMN     "tipoLivre" TEXT;
