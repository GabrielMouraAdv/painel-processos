-- Renomear campo advogadoRedatorId -> advogadoRespId no Prazo judicial,
-- padronizando com PrazoTce.

ALTER TABLE "Prazo" RENAME COLUMN "advogadoRedatorId" TO "advogadoRespId";

ALTER INDEX "Prazo_advogadoRedatorId_idx" RENAME TO "Prazo_advogadoRespId_idx";

ALTER TABLE "Prazo" RENAME CONSTRAINT "Prazo_advogadoRedatorId_fkey" TO "Prazo_advogadoRespId_fkey";
