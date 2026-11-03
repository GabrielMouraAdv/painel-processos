-- Data da ultima checagem forcada no PJe (TecJustica) por processo.
ALTER TABLE "MonitoramentoConfig" ADD COLUMN "pdpjVerificadoEm" TIMESTAMP(3);

-- Checagens ja feitas: a data em que os movimentos do PDPJ foram gravados.
UPDATE "MonitoramentoConfig" mc
SET "pdpjVerificadoEm" = m.ultima
FROM (
  SELECT "processoId", MAX("createdAt") AS ultima
  FROM "MovimentacaoAutomatica"
  WHERE "fonte" = 'PDPJ'
  GROUP BY "processoId"
) m
WHERE m."processoId" = mc."processoId";
