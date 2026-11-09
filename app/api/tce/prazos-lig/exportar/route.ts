import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { diaDe } from "@/lib/datas";
import { ehDiaUtil } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import {
  aplicarDispensas,
  dispensaLig,
  hojeFortaleza,
  linhaPrazo,
  rosVirtuais,
  situacaoAgenda,
  sugestaoDaLinha,
  sugestaoLig,
  urgencia,
  type ItemAgendaL1,
  type SituacaoAgenda,
} from "@/lib/prazos-lig";

export const dynamic = "force-dynamic";

// Exporta para o Excel os prazos pendentes de agendamento da aba "Agendamento de
// publicacoes": em aberto e fora da agenda do Legal One (nao agendado ou so outra
// peca do processo), sem o RO virtual. Mesmo criterio do cartao "Sem agenda no
// Legal One". Colunas na ordem da planilha da triagem LIG + texto da publicacao.

const SITUACAO: Record<SituacaoAgenda["tipo"], string> = {
  agendado: "Agendado",
  data_diferente: "Agendado com data diferente",
  outra_peca: "Só outra peça do processo na agenda",
  nao_agendado: "Não agendado",
};

function celula(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const desdeAgenda = new Date(Date.now() - 120 * 864e5);
  const [prazosDb, agendaDb, dispensasDb, sugestoesDb, avulsosDb] = await Promise.all([
    prisma.prazoLig.findMany({ where: { ativoNaPlanilha: true }, orderBy: { idPlanilha: "asc" } }),
    prisma.compromisso.findMany({
      where: { descricao: { startsWith: "Importado da agenda do Legal One" }, dataInicio: { gte: desdeAgenda } },
      select: { titulo: true, dataInicio: true, advogado: { select: { nome: true } } },
    }),
    prisma.dispensaPrazoLig.findMany({ where: { desfeitaEm: null } }),
    prisma.sugestaoAgendamentoLig.findMany({ where: { substituidaEm: null }, orderBy: { createdAt: "desc" } }),
    prisma.agendamentoAvulsoLig.findMany({ where: { concluidoEm: null }, orderBy: { createdAt: "asc" } }),
  ]);

  const prazos = aplicarDispensas(prazosDb.map(linhaPrazo), dispensasDb.map(dispensaLig));
  const urg = urgencia(prazos, hojeFortaleza());
  const agenda: ItemAgendaL1[] = agendaDb.map((c) => ({ titulo: c.titulo, dia: diaDe(c.dataInicio), advogado: c.advogado.nome }));
  const virtuais = rosVirtuais(prazos, urg, (iso, tce) => ehDiaUtil(iso, tce ? "TCE_PE" : "TRF1"));
  const aberto = new Map(urg.map((u) => [u.ID, u]));

  const pendentes = prazos
    .map((r) => ({ r, u: aberto.get(r.ID), s: situacaoAgenda(r, agenda) }))
    .filter(({ r, u, s }) => u?.emAberto && !virtuais.has(r.ID) && (s.tipo === "nao_agendado" || s.tipo === "outra_peca"))
    .sort((a, b) => (a.u!.diasInterno ?? 99999) - (b.u!.diasInterno ?? 99999));

  // Texto da publicacao: aba Publicacoes; se faltar, a coluna V da aba Prazos.
  const pubIds = Array.from(new Set(pendentes.map(({ r }) => r["Publicação"]).filter(Boolean)));
  const pubs = pubIds.length ? await prisma.publicacaoLig.findMany({ where: { pubId: { in: pubIds } }, select: { pubId: true, texto: true } }) : [];
  const textoPub = new Map(pubs.map((p) => [p.pubId, p.texto]));
  const colunaV = new Map(prazosDb.map((p) => [p.idPlanilha, p.textoPublicacao]));

  const colunas = Object.keys(linhaPrazo(prazosDb[0] ?? ({} as (typeof prazosDb)[number])));
  const sugestoes = sugestoesDb.map(sugestaoLig);
  // Agendamento: o escolhido no painel ou, sem escolha, o sugerido pela triagem (peca, prazo, prazo interno).
  const cabecalho = [
    ...colunas,
    "Situação no Legal One",
    "Agendamento",
    "Prazo do agendamento",
    "Data para a agenda",
    "Origem do agendamento",
    "Texto da publicação",
  ];
  const linhas = pendentes.map(({ r, s }) => {
    const texto = textoPub.get(r["Publicação"]) || colunaV.get(r.ID) || "";
    const legalOne = s.tipo === "outra_peca" ? `${SITUACAO[s.tipo]}: ${s.item.titulo}` : SITUACAO[s.tipo];
    const sug = sugestaoDaLinha(r, sugestoes);
    const quando = sug ? new Date(sug.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" }) : "";
    const agendamento = sug
      ? [sug.agendamento, sug.prazo, sug.dataAgenda, `Escolhido no painel por ${sug.usuarioNome} em ${quando}`]
      : [r["Peça / providência"] ?? "", r["Prazo (dias) e contagem"] ?? "", r["Prazo interno"] || r["Prazo fatal"] || "", "Sugestão da triagem (não confirmada)"];
    return [...colunas.map((c) => r[c] ?? ""), legalOne, ...agendamento, texto];
  });

  // Agendamentos avulsos (fora da triagem LIG): mesmas colunas; saem quando a mesma
  // peca do processo ja esta na agenda do Legal One.
  for (const a of avulsosDb) {
    const r: Record<string, string> = Object.fromEntries(colunas.map((c) => [c, ""]));
    Object.assign(r, {
      ID: `AV-${a.id.slice(-5).toUpperCase()}`,
      Status: "A fazer",
      "Lançado no Legal One?": "Não",
      "Prazo interno": a.dataAgenda,
      "Prazo fatal": a.prazoFatalTexto,
      "Peça / providência": a.peca,
      "Prazo (dias) e contagem": a.prazo,
      "Nº do processo": a.numeroProcesso,
      "Órgão / tribunal": a.orgao,
      "Cliente / ente": a.cliente,
      "Observações / alertas": a.observacoes,
    });
    const s = situacaoAgenda(r, agenda);
    if (s.tipo === "agendado" || s.tipo === "data_diferente") continue;
    const quando = a.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
    const legalOne = s.tipo === "outra_peca" ? `${SITUACAO[s.tipo]}: ${s.item.titulo}` : SITUACAO[s.tipo];
    linhas.push([
      ...colunas.map((c) => r[c] ?? ""),
      legalOne,
      a.peca,
      a.prazo,
      a.dataAgenda,
      `Agendamento avulso incluído no painel por ${a.usuarioNome} em ${quando} (fora da triagem LIG)`,
      a.textoPublicacao,
    ]);
  }

  // CSV com ";" e BOM: o Excel em portugues abre direto, com acentos e quebras de linha.
  const csv = "﻿" + [cabecalho, ...linhas].map((l) => l.map(celula).join(";")).join("\r\n");
  const nome = `prazos-pendentes-de-agendamento-${hojeFortaleza()}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
