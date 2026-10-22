-- Marcacao de processo prioritario (pagina Hoje)
ALTER TABLE "Processo" ADD COLUMN "prioritario" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Processo_escritorioId_prioritario_idx" ON "Processo"("escritorioId", "prioritario");
