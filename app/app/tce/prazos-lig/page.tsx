import { PaginaCabecalho } from "@/components/pagina-cabecalho";
import { prisma } from "@/lib/prisma";
import {
  LIMITE_HORAS_SYNC,
  hojeFortaleza,
  horasUteisDesde,
  linhaConferencia,
  linhaPrazo,
  proximo,
  resumo,
  urgencia,
} from "@/lib/prazos-lig";

import { PrazosLigView, type CienciaRow, type PublicacaoRow } from "./prazos-lig-view";

export const dynamic = "force-dynamic";

const fmtSync = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Fortaleza",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function PrazosLigPage() {
  const [prazosDb, confDb, cienciaDb, ultimoSync] = await Promise.all([
    prisma.prazoLig.findMany({ where: { ativoNaPlanilha: true }, orderBy: { idPlanilha: "asc" } }),
    prisma.conferenciaLig.findMany({ where: { ativoNaPlanilha: true }, orderBy: { linhaPlanilha: "asc" } }),
    prisma.cienciaLig.findMany({ where: { ativoNaPlanilha: true }, orderBy: { linhaPlanilha: "asc" } }),
    prisma.syncPrazosLig.findFirst({ where: { ok: true }, orderBy: { concluidoEm: "desc" } }),
  ]);
  const pubIds = Array.from(new Set(prazosDb.map((p) => p.pubId).filter(Boolean)));
  const pubsDb = pubIds.length
    ? await prisma.publicacaoLig.findMany({ where: { pubId: { in: pubIds } } })
    : [];

  const prazos = prazosDb.map(linhaPrazo);
  const conf = confDb.map(linhaConferencia);
  const hoje = hojeFortaleza();
  const urg = urgencia(prazos, hoje);
  const res = resumo(urg, prazos);
  const prox = proximo(urg, prazos);

  // Texto da publicacao: aba Publicacoes; se faltar, a coluna V da aba Prazos.
  const publicacoes: Record<string, PublicacaoRow> = {};
  for (const p of pubsDb) {
    publicacoes[p.pubId] = {
      diario: p.diarioEdicao,
      data: p.dataPublicacaoTexto,
      origem: p.origemLig,
      texto: p.texto,
      inteiroTeor: /^https:\/\//.test(p.inteiroTeorUrl) ? p.inteiroTeorUrl : "",
    };
  }
  const textoColunaV: Record<string, string> = {};
  for (const p of prazosDb) if (p.textoPublicacao) textoColunaV[p.idPlanilha] = p.textoPublicacao;

  const ciencia: CienciaRow[] = cienciaDb.map((c) => ({
    data: c.dataPublicacaoTexto,
    processo: c.numeroProcesso,
    cliente: c.cliente,
    motivo: c.motivo,
  }));

  const sincronizadoEm = ultimoSync?.concluidoEm ?? null;
  const atrasado = !sincronizadoEm || horasUteisDesde(sincronizadoEm) > LIMITE_HORAS_SYNC;

  return (
    <div className="space-y-6">
      <PaginaCabecalho
        secao="Tribunal de Contas · cobertura das férias da Heloísa"
        titulo="Agendamento de publicações"
        descricao={
          <>
            Lido da planilha de controle da triagem LIG. {res.ativos} providências em aberto, {res.ateAmanha} com prazo
            interno até amanhã.{" "}
            <span className="whitespace-nowrap text-white/60">
              Sincronizado em {sincronizadoEm ? fmtSync.format(sincronizadoEm).replace(",", "") : "—"}
            </span>
          </>
        }
      />

      {atrasado && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>Sincronização atrasada.</b>{" "}
          {sincronizadoEm
            ? "A última leitura da planilha tem mais de 30 horas em dia útil. Os prazos abaixo podem estar desatualizados; confira a planilha ou rode a rotina de sincronização."
            : "A planilha ainda não foi sincronizada com o painel."}
        </div>
      )}

      <PrazosLigView
        hoje={hoje}
        prazos={prazos}
        conf={conf}
        ciencia={ciencia}
        publicacoes={publicacoes}
        textoColunaV={textoColunaV}
        resumo={res}
        proximo={prox}
      />
    </div>
  );
}
