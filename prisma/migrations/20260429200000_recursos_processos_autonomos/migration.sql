-- Refatoracao: recursos (RO, ED, AGR, etc) viram ProcessoTce autonomos
-- vinculados ao ProcessoTce de origem via `processoOrigemId`, em vez de
-- subprocessos subordinados.
--
-- Estrategia:
-- 1) Adiciona colunas novas ao ProcessoTce
-- 2) Copia cada SubprocessoTce existente como novo ProcessoTce
-- 3) Migra prazos, andamentos e documentos para os novos ProcessoTce
-- 4) Reescreve processoOrigemId dos recursos cuja origem era outro
--    SubprocessoTce, apontando agora para o ProcessoTce equivalente
-- 5) Mantem as tabelas SubprocessoTce* originais como backup historico

-- 1. Novas colunas em ProcessoTce
ALTER TABLE "ProcessoTce" ADD COLUMN "ehRecurso" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProcessoTce" ADD COLUMN "tipoRecurso" "TipoRecursoTce";
ALTER TABLE "ProcessoTce" ADD COLUMN "processoOrigemId" TEXT;

CREATE INDEX "ProcessoTce_processoOrigemId_idx" ON "ProcessoTce"("processoOrigemId");
CREATE INDEX "ProcessoTce_ehRecurso_idx" ON "ProcessoTce"("ehRecurso");

ALTER TABLE "ProcessoTce"
  ADD CONSTRAINT "ProcessoTce_processoOrigemId_fkey"
  FOREIGN KEY ("processoOrigemId") REFERENCES "ProcessoTce"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Tabela auxiliar com mapping subprocessoId -> novoProcessoTceId
CREATE TEMP TABLE "_subproc_map" (
  "subprocessoId" TEXT PRIMARY KEY,
  "processoTceId" TEXT NOT NULL,
  "processoPaiId" TEXT NOT NULL,
  "subprocessoPaiId" TEXT,
  "escritorioId" TEXT NOT NULL
);

-- Cada SubprocessoTce vira um novo ProcessoTce com ehRecurso=true.
-- O id do novo ProcessoTce e gerado por md5(subprocessoId) para ser estavel.
INSERT INTO "_subproc_map" ("subprocessoId", "processoTceId", "processoPaiId", "subprocessoPaiId", "escritorioId")
SELECT
  s.id,
  'r_' || substr(md5(s.id), 1, 22),
  s."processoPaiId",
  s."subprocessoPaiId",
  p."escritorioId"
FROM "SubprocessoTce" s
JOIN "ProcessoTce" p ON p.id = s."processoPaiId";

-- 3. Cria os novos ProcessoTce a partir dos SubprocessoTce
INSERT INTO "ProcessoTce" (
  "id", "numero", "tipo", "municipioId", "relator", "camara", "faseAtual",
  "conselheiroSubstituto", "notaTecnica", "parecerMpco", "despachadoComRelator",
  "memorialPronto", "memorialAgendadoData", "memorialAgendadoAdvogadoId",
  "contrarrazoesNtApresentadas", "contrarrazoesMpcoApresentadas",
  "contrarrazoesNtDispensadas", "contrarrazoesNtDispensadoPor",
  "contrarrazoesNtDispensadoEm", "contrarrazoesNtDispensadoMotivo",
  "contrarrazoesMpcoDispensadas", "contrarrazoesMpcoDispensadoPor",
  "contrarrazoesMpcoDispensadoEm", "contrarrazoesMpcoDispensadoMotivo",
  "julgado", "dataJulgamento", "resultadoJulgamento", "penalidade",
  "valorMulta", "valorDevolucao", "observacoesJulgamento",
  "prognosticoDespacho", "retornoDespacho", "dataDespacho", "incluidoNoDespacho",
  "despachoAgendadoData", "despachoAgendadoAdvogadoId",
  "memorialDispensado", "memorialDispensadoPor", "memorialDispensadoEm",
  "memorialDispensadoMotivo", "despachoDispensado", "despachoDispensadoPor",
  "despachoDispensadoEm", "despachoDispensadoMotivo",
  "exercicio", "valorAutuado", "objeto", "dataAutuacao", "dataIntimacao",
  "bancasSlug", "ehRecurso", "tipoRecurso", "processoOrigemId",
  "escritorioId", "createdAt", "updatedAt"
)
SELECT
  m."processoTceId",
  s."numero",
  p."tipo",
  p."municipioId",
  s."relator",
  p."camara",
  s."fase",
  NULL,
  false, false,
  COALESCE(s."despachadoComRelator", false),
  COALESCE(s."memorialPronto", false),
  s."memorialAgendadoData", s."memorialAgendadoAdvogadoId",
  false, false,
  false, NULL, NULL, NULL,
  false, NULL, NULL, NULL,
  false, NULL, NULL, NULL,
  NULL, NULL, NULL,
  s."prognosticoDespacho", s."retornoDespacho", s."dataDespacho", false,
  s."despachoAgendadoData", s."despachoAgendadoAdvogadoId",
  COALESCE(s."memorialDispensado", false), s."memorialDispensadoPor",
  s."memorialDispensadoEm", s."memorialDispensadoMotivo",
  COALESCE(s."despachoDispensado", false), s."despachoDispensadoPor",
  s."despachoDispensadoEm", s."despachoDispensadoMotivo",
  p."exercicio", NULL, COALESCE(s."observacoes", '(recurso interposto)'),
  s."dataInterposicao", s."dataIntimacao",
  CASE WHEN array_length(s."bancasSlug", 1) > 0 THEN s."bancasSlug" ELSE p."bancasSlug" END,
  true, s."tipoRecurso",
  -- processoOrigemId: se o pai for um subprocesso, ainda nao sabemos o id;
  -- preenchemos no UPDATE seguinte. Por padrao aponta para o processo raiz.
  s."processoPaiId",
  p."escritorioId",
  s."createdAt", s."updatedAt"
FROM "SubprocessoTce" s
JOIN "ProcessoTce" p ON p.id = s."processoPaiId"
JOIN "_subproc_map" m ON m."subprocessoId" = s.id;

-- Recursos cujo pai era outro SubprocessoTce: aponta para o novo ProcessoTce equivalente.
UPDATE "ProcessoTce" pt
SET "processoOrigemId" = pai."processoTceId"
FROM "_subproc_map" m
JOIN "_subproc_map" pai ON pai."subprocessoId" = m."subprocessoPaiId"
WHERE pt.id = m."processoTceId" AND m."subprocessoPaiId" IS NOT NULL;

-- 4. Migra prazos do subprocesso para PrazoTce vinculados ao novo ProcessoTce
INSERT INTO "PrazoTce" (
  "id", "processoId", "tipo", "dataIntimacao", "dataVencimento", "diasUteis",
  "prorrogavel", "prorrogacaoPedida", "dataProrrogacao", "cumprido",
  "advogadoRespId", "observacoes", "dispensado", "dispensadoPor",
  "dispensadoEm", "dispensadoMotivo", "createdAt"
)
SELECT
  'rp_' || substr(md5(pr.id), 1, 21),
  m."processoTceId",
  pr."tipo", pr."dataIntimacao", pr."dataVencimento", pr."diasUteis",
  pr."prorrogavel", pr."prorrogacaoPedida", NULL, pr."cumprido",
  pr."advogadoRespId", pr."observacoes",
  COALESCE(pr."dispensado", false), pr."dispensadoPor",
  pr."dispensadoEm", pr."dispensadoMotivo",
  pr."createdAt"
FROM "PrazoSubprocessoTce" pr
JOIN "_subproc_map" m ON m."subprocessoId" = pr."subprocessoId";

-- 5. Migra andamentos
INSERT INTO "AndamentoTce" (
  "id", "processoId", "data", "fase", "descricao", "autorId", "createdAt"
)
SELECT
  'ra_' || substr(md5(a.id), 1, 21),
  m."processoTceId",
  a."data", a."fase", a."descricao", a."autorId", a."createdAt"
FROM "AndamentoSubprocessoTce" a
JOIN "_subproc_map" m ON m."subprocessoId" = a."subprocessoId";

-- 6. Migra documentos
INSERT INTO "DocumentoTce" (
  "id", "processoTceId", "nome", "url", "tipo", "tamanho", "uploadedBy", "createdAt"
)
SELECT
  'rd_' || substr(md5(d.id), 1, 21),
  m."processoTceId",
  d."nome", d."url", d."tipo", d."tamanho", d."uploadedBy", d."createdAt"
FROM "DocumentoSubprocessoTce" d
JOIN "_subproc_map" m ON m."subprocessoId" = d."subprocessoId";

-- _subproc_map e TEMP, sera removida ao fim da transacao automaticamente.
