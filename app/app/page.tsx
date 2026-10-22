import Link from "next/link";
import { Fragment } from "react";
import { getServerSession } from "next-auth";

import { NumeroProcesso } from "@/components/numero-processo";
import { authOptions } from "@/lib/auth";
import { diaDe, hojeDia } from "@/lib/datas";
import { FONTE_DJEN_OAB, resumoDe } from "@/lib/djen-oab";
import { datajudParadoHa, datajudUltimaAtualizacao } from "@/lib/monitoramento-verificar";
import { classeBadgeResultado, classificarResultadoTce } from "@/lib/julgamento-config";
import { filtroVisibilidadeCompromissos } from "@/lib/permissoes";
import { CATEGORIA_PRIORITARIO_LABELS, carregarPrioritarios, type CategoriaPrioritario } from "@/lib/prioritarios";
import { prisma } from "@/lib/prisma";
import { endOfWeekUTC, startOfWeekUTC } from "@/lib/semana";
import { SITUACAO_TCE_LABELS, situacaoTce, whereSituacaoTce } from "@/lib/situacao-tce";
import { TCE_CAMARA_LABELS, TCE_TIPO_LABELS } from "@/lib/tce-config";
import { cn } from "@/lib/utils";

import { HojePrazoAcoes } from "./hoje-prazo-acoes";

// Inicio "Pauta de hoje" (Direcao A), na ordem que os socios leem: a semana
// (prazos por advogado e pauta do TCE-PE), os processos prioritarios de
// improbidade/criminal, os vencidos sem baixa, a regua de 14 dias e, por fim,
// a fila de trabalho e as novidades judiciais.

const SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

// "aaaa-mm-dd" +n dias (aritmetica em UTC para nao depender do fuso).
function somaDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const br = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");
const diasEntre = (a: string, b: string) =>
  Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);

type ItemRegua = { tipo: "prazo" | "sessao" | "compromisso"; texto: string; href: string };

// Bloco "Semana": tipos de compromisso (lib/schemas.ts) com rotulo de exibicao.
const COMPROMISSO_TIPO_LABEL: Record<string, string> = {
  REUNIAO: "Reunião",
  AUDIENCIA: "Audiência",
  SUSTENTACAO: "Sustentação oral",
  DESPACHO_PRESENCIAL: "Despacho presencial",
  VIAGEM: "Viagem",
  PESSOAL: "Pessoal",
  OUTRO: "Compromisso",
};
const SEM_RESPONSAVEL = "Sem responsável";
type ItemAgenda = { dia: string; tipo: "prazo" | "compromisso"; rotulo: string; texto: string; href: string };
const diaSemanaCurto = (iso: string) => SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()];

export default async function HojePage() {
  const session = await getServerSession(authOptions);
  const user = session!.user;
  const escritorioId = user.escritorioId;

  const hoje = hojeDia();
  const fimRegua = somaDias(hoje, 13);
  const iniBusca = new Date(`${somaDias(hoje, -1)}T00:00:00Z`);
  const fimBusca = new Date(`${somaDias(fimRegua, 1)}T23:59:59Z`);

  // Semana corrente (segunda a domingo), para o bloco "Semana".
  const semIni = startOfWeekUTC(new Date(`${hoje}T12:00:00Z`));
  const semFim = endOfWeekUTC(semIni);
  const semIniDia = semIni.toISOString().slice(0, 10);
  const semFimDia = semFim.toISOString().slice(0, 10);
  const naSemana = (dia: string) => dia >= semIniDia && dia <= semFimDia;

  const [
    prazosTce, prazosJud, compromissos, sessoesTce, sessoesJud,
    emJulgamentoSemMemorial, contrarrazoesPendentes, recursoPendente, situacaoConfirmar,
    novidadesGrupo,
    itensSemana, compromissosSemana,
    intimacoes, datajudUltima,
    prioritarios,
  ] = await Promise.all([
    prisma.prazoTce.findMany({
      where: { cumprido: false, dispensado: false, processo: { escritorioId } },
      orderBy: { dataVencimento: "asc" },
      select: {
        id: true, tipo: true, dataVencimento: true,
        advogadoResp: { select: { nome: true } },
        processo: { select: { id: true, numero: true, tipo: true, municipio: { select: { nome: true } } } },
      },
    }),
    prisma.prazo.findMany({
      where: { cumprido: false, dispensado: false, processo: { escritorioId } },
      orderBy: { data: "asc" },
      select: {
        id: true, tipo: true, data: true,
        advogadoResp: { select: { nome: true } },
        processo: { select: { id: true, numero: true, gestor: { select: { nome: true } } } },
      },
    }),
    prisma.compromisso.findMany({
      where: { escritorioId, cumprido: false, dataInicio: { gte: iniBusca, lte: fimBusca }, ...filtroVisibilidadeCompromissos(user) },
      orderBy: { dataInicio: "asc" },
      select: { id: true, titulo: true, dataInicio: true },
    }),
    prisma.sessaoPauta.findMany({
      where: { escritorioId, data: { gte: iniBusca, lte: fimBusca } },
      select: { id: true, data: true, camara: true, _count: { select: { itens: true } } },
    }),
    prisma.sessaoJudicial.findMany({
      where: { escritorioId, data: { gte: iniBusca, lte: fimBusca } },
      select: { id: true, data: true, tribunal: true, orgaoJulgador: true, _count: { select: { itens: true } } },
    }),
    prisma.processoTce.count({
      where: { escritorioId, memorialPronto: false, memorialDispensado: false, AND: [whereSituacaoTce("em_julgamento")] },
    }),
    prisma.processoTce.count({
      where: {
        escritorioId,
        julgado: false,
        OR: [
          { notaTecnica: true, contrarrazoesNtApresentadas: false, contrarrazoesNtDispensadas: false },
          { parecerMpco: true, contrarrazoesMpcoApresentadas: false, contrarrazoesMpcoDispensadas: false },
        ],
      },
    }),
    prisma.processoTce.count({ where: { escritorioId, AND: [whereSituacaoTce("recurso_pendente")] } }),
    prisma.processoTce.count({ where: { escritorioId, ehRecurso: false, andamentos: { none: {} } } }),
    prisma.movimentacaoAutomatica.groupBy({
      by: ["processoId"],
      where: { lida: false, processo: { escritorioId } },
      _count: { _all: true },
      _max: { dataMovimento: true },
      orderBy: { _max: { dataMovimento: "desc" } },
    }),
    // Itens da pauta do TCE-PE na semana corrente, com o processo do painel quando vinculado.
    prisma.itemPauta.findMany({
      where: { sessao: { escritorioId, data: { gte: semIni, lte: semFim } } },
      orderBy: [{ sessao: { data: "asc" } }, { sessao: { camara: "asc" } }, { ordem: "asc" }, { createdAt: "asc" }],
      select: {
        id: true, numeroProcesso: true, municipio: true, advogadoResp: true,
        prognostico: true, providencia: true, retiradoDePauta: true, pedidoVistas: true,
        sessao: { select: { data: true, camara: true } },
        processoTce: {
          select: {
            id: true, tipo: true, julgado: true, dataJulgamento: true, resultadoJulgamento: true,
            faseAtual: true, dataTransito: true, notaTecnica: true, parecerMpco: true,
            memorialPronto: true, despachadoComRelator: true,
            recursos: { where: { julgado: false }, select: { id: true } },
          },
        },
      },
    }),
    // Compromissos da semana (com folga de um dia; o dia certo e conferido por diaDe).
    prisma.compromisso.findMany({
      where: {
        escritorioId, cumprido: false,
        dataInicio: { gte: new Date(`${somaDias(semIniDia, -1)}T00:00:00Z`), lte: new Date(`${somaDias(semFimDia, 1)}T23:59:59Z`) },
        ...filtroVisibilidadeCompromissos(user),
      },
      orderBy: { dataInicio: "asc" },
      select: { id: true, titulo: true, tipo: true, dataInicio: true, advogado: { select: { nome: true } } },
    }),
    // Intimacoes da varredura do DJEN por OAB (fonte primaria), ultimos 14 dias.
    prisma.publicacaoDJEN.findMany({
      where: { fonte: FONTE_DJEN_OAB, lida: false, dataPublicacao: { gte: new Date(Date.now() - 14 * 86_400_000) }, processo: { escritorioId } },
      orderBy: { dataPublicacao: "desc" },
      take: 5,
      select: {
        id: true, dataPublicacao: true, conteudo: true, tipoComunicacao: true,
        processo: { select: { id: true, numero: true, tribunal: true, gestor: { select: { nome: true } } } },
      },
    }),
    datajudUltimaAtualizacao(escritorioId),
    carregarPrioritarios(escritorioId),
  ]);
  const datajudParado = datajudParadoHa(datajudUltima);

  // ---------------------------------------------------------------- semana: em pauta
  const itensPauta = itensSemana.map((it) => {
    const p = it.processoTce;
    const selos: string[] = [];
    let situacao: { texto: string; classe?: string; julgado: boolean } | null = null;
    if (p) {
      const julgadoNaSemana = p.julgado && !!p.dataJulgamento && naSemana(diaDe(p.dataJulgamento));
      if (julgadoNaSemana) {
        situacao = {
          texto: `Julgado: ${p.resultadoJulgamento ?? "resultado não lançado"}`,
          classe: classeBadgeResultado(classificarResultadoTce(p.tipo, p.resultadoJulgamento)),
          julgado: true,
        };
      } else {
        const s = situacaoTce({
          julgado: p.julgado, faseAtual: p.faseAtual, dataTransito: p.dataTransito,
          recursosPendentes: p.recursos.length, notaTecnica: p.notaTecnica, parecerMpco: p.parecerMpco,
        });
        situacao = { texto: SITUACAO_TCE_LABELS[s], julgado: false };
      }
      if (p.notaTecnica) selos.push("NT");
      if (p.parecerMpco) selos.push("MPCO");
      if (p.memorialPronto) selos.push("Memorial");
      if (p.despachadoComRelator) selos.push("Despachado");
    }
    return { ...it, dia: diaDe(it.sessao.data), situacao, selos };
  });
  type GrupoPauta = { chave: string; dia: string; camara: keyof typeof TCE_CAMARA_LABELS; itens: typeof itensPauta };
  const gruposPauta: GrupoPauta[] = [];
  for (const it of itensPauta) {
    const chave = `${it.dia}|${it.sessao.camara}`;
    let g = gruposPauta.find((x) => x.chave === chave);
    if (!g) {
      g = { chave, dia: it.dia, camara: it.sessao.camara, itens: [] };
      gruposPauta.push(g);
    }
    g.itens.push(it);
  }
  const semCadastro = itensPauta.filter((it) => !it.processoTce).length;

  // ---------------------------------------------------------------- semana: prazos e compromissos por advogado
  const agenda = new Map<string, ItemAgenda[]>();
  const agendaPoe = (nome: string | null | undefined, item: ItemAgenda) => {
    const k = nome?.trim() || SEM_RESPONSAVEL;
    if (!agenda.has(k)) agenda.set(k, []);
    agenda.get(k)!.push(item);
  };
  for (const p of prazosTce) {
    const d = diaDe(p.dataVencimento);
    if (naSemana(d)) agendaPoe(p.advogadoResp?.nome, { dia: d, tipo: "prazo", rotulo: "Prazo TCE", texto: `${p.tipo} · ${p.processo.numero}`, href: `/app/tce/processos/${p.processo.id}` });
  }
  for (const p of prazosJud) {
    const d = diaDe(p.data);
    if (naSemana(d)) agendaPoe(p.advogadoResp?.nome, { dia: d, tipo: "prazo", rotulo: "Prazo judicial", texto: `${p.tipo} · ${p.processo.numero}`, href: `/app/processos/${p.processo.id}` });
  }
  for (const c of compromissosSemana) {
    const d = diaDe(c.dataInicio);
    if (naSemana(d)) agendaPoe(c.advogado.nome, { dia: d, tipo: "compromisso", rotulo: COMPROMISSO_TIPO_LABEL[c.tipo] ?? c.tipo, texto: c.titulo, href: "/app/compromissos" });
  }
  const agendaPorAdvogado = Array.from(agenda.entries())
    .map(([nome, itens]) => ({ nome, itens: itens.sort((a, b) => (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0)) }))
    .sort((a, b) =>
      a.nome === SEM_RESPONSAVEL ? 1 : b.nome === SEM_RESPONSAVEL ? -1 : a.nome.localeCompare(b.nome, "pt-BR"),
    );
  const todaAgenda = agendaPorAdvogado.flatMap((a) => a.itens);
  const nPrazosSemana = todaAgenda.filter((i) => i.tipo === "prazo").length;
  const nCompromissosSemana = todaAgenda.filter((i) => i.tipo === "compromisso").length;
  const rodapeSemana = [
    `${itensPauta.length} ${itensPauta.length === 1 ? "item" : "itens"} em pauta${semCadastro ? ` (${semCadastro} sem cadastro)` : ""}`,
    `${nPrazosSemana} ${nPrazosSemana === 1 ? "prazo" : "prazos"}`,
    `${nCompromissosSemana} ${nCompromissosSemana === 1 ? "compromisso" : "compromissos"}`,
  ].join(" · ");

  // ---------------------------------------------------------------- vencidos sem baixa
  const vencidos = [
    ...prazosTce
      .filter((p) => diaDe(p.dataVencimento) < hoje)
      .map((p) => ({
        id: p.id, escopo: "tce" as const, dia: diaDe(p.dataVencimento), tipo: p.tipo,
        numero: p.processo.numero, href: `/app/tce/processos/${p.processo.id}`,
        contexto: [p.processo.municipio?.nome, TCE_TIPO_LABELS[p.processo.tipo]].filter(Boolean).join(" · "),
        resp: p.advogadoResp?.nome ?? null,
      })),
    ...prazosJud
      .filter((p) => diaDe(p.data) < hoje)
      .map((p) => ({
        id: p.id, escopo: "judicial" as const, dia: diaDe(p.data), tipo: p.tipo,
        numero: p.processo.numero, href: `/app/processos/${p.processo.id}`,
        contexto: p.processo.gestor?.nome ?? "", resp: p.advogadoResp?.nome ?? null,
      })),
  ].sort((a, b) => (a.dia < b.dia ? -1 : 1));

  // ---------------------------------------------------------------- regua de 14 dias
  const dias = Array.from({ length: 14 }, (_, i) => somaDias(hoje, i));
  const regua = new Map<string, ItemRegua[]>(dias.map((d) => [d, []]));
  const poe = (dia: string, item: ItemRegua) => regua.get(dia)?.push(item);
  for (const p of prazosTce) poe(diaDe(p.dataVencimento), { tipo: "prazo", texto: `${p.tipo} · ${p.processo.numero}`, href: `/app/tce/processos/${p.processo.id}` });
  for (const p of prazosJud) poe(diaDe(p.data), { tipo: "prazo", texto: `${p.tipo} · ${p.processo.numero}`, href: `/app/processos/${p.processo.id}` });
  for (const s of sessoesTce) if (s._count.itens > 0) poe(diaDe(s.data), { tipo: "sessao", texto: `Pauta TCE · ${s.camara === "PLENO" ? "Pleno" : s.camara === "PRIMEIRA" ? "1ª Câmara" : "2ª Câmara"} (${s._count.itens})`, href: "/app/tce/pauta" });
  for (const s of sessoesJud) if (s._count.itens > 0) poe(diaDe(s.data), { tipo: "sessao", texto: `Pauta ${s.tribunal} · ${s.orgaoJulgador} (${s._count.itens})`, href: "/app/pautas" });
  for (const c of compromissos) poe(diaDe(c.dataInicio), { tipo: "compromisso", texto: c.titulo, href: "/app/compromissos" });
  const totalRegua = Array.from(regua.values()).reduce((a, l) => a + l.length, 0);

  // ---------------------------------------------------------------- novidades judiciais
  const topNovidades = novidadesGrupo.slice(0, 5);
  const procsNov = topNovidades.length
    ? await prisma.processo.findMany({
        where: { id: { in: topNovidades.map((g) => g.processoId) } },
        select: {
          id: true, numero: true, tribunal: true, gestor: { select: { nome: true } },
          movimentacoesAuto: { where: { lida: false }, orderBy: { dataMovimento: "desc" }, take: 1, select: { nomeMovimento: true, dataMovimento: true } },
        },
      })
    : [];
  const novidades = topNovidades
    .map((g) => ({ g, p: procsNov.find((p) => p.id === g.processoId) }))
    .filter((x) => x.p);

  // ---------------------------------------------------------------- prioritarios por categoria
  const gruposPrio = (["em_pauta", "prazo_aberto", "concluso", "parado"] as CategoriaPrioritario[])
    .map((cat) => ({ cat, itens: prioritarios.filter((p) => p.categoria === cat) }))
    .filter((g) => g.itens.length > 0);
  const nPrio = (cat: CategoriaPrioritario) => prioritarios.filter((p) => p.categoria === cat).length;

  // ---------------------------------------------------------------- cabecalho
  const dHoje = new Date(`${hoje}T12:00:00Z`);
  const titulo = `${DIAS_SEMANA[dHoje.getUTCDay()]}, ${dHoje.getUTCDate()} de ${MESES[dHoje.getUTCMonth()]}`;
  const resumo = [
    totalRegua === 0 ? "Nada cadastrado nos próximos 14 dias." : `${totalRegua} ${totalRegua === 1 ? "compromisso" : "itens"} nos próximos 14 dias.`,
    vencidos.length ? `${vencidos.length} ${vencidos.length === 1 ? "prazo vencido continua" : "prazos vencidos continuam"} sem baixa.` : "Nenhum prazo vencido sem baixa.",
    prioritarios.length
      ? `${prioritarios.length} prioritários: ${nPrio("em_pauta")} em pauta, ${nPrio("prazo_aberto")} com prazo, ${nPrio("concluso")} conclusos, ${nPrio("parado")} parados.`
      : "",
  ].filter(Boolean).join(" ");

  const fila = [
    { n: emJulgamentoSemMemorial, t: "Em julgamento sem memorial", d: "TCE · nenhum memorial pronto ou dispensado", href: "/app/tce/processos?situacao=em_julgamento" },
    { n: contrarrazoesPendentes, t: "Contrarrazões pendentes", d: "TCE · Nota Técnica ou Parecer do MPCO sem resposta", href: "/app/tce/pendencias" },
    { n: recursoPendente, t: "Julgados com recurso pendente", d: "TCE · aguardando o julgamento do recurso", href: "/app/tce/processos?situacao=recurso_pendente" },
    { n: situacaoConfirmar, t: "Processos sem nenhum andamento", d: "TCE · falta carregar a linha do tempo", href: "/app/tce/processos" },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:px-10">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Pauta do escritório</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight text-brand-tinta md:text-4xl">{titulo}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{resumo}</p>
      </header>

      {/* ------------------------------------------------ semana */}
      <section className="rounded-xl border bg-white" aria-labelledby="semana">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
          <h2 id="semana" className="text-xl font-semibold">Semana</h2>
          <span className="text-[13px] text-muted-foreground">
            {br(semIniDia)} a {br(semFimDia)} · prazos por advogado e pauta do TCE-PE
          </span>
        </div>

        {/* prazos e compromissos da semana */}
        <div className="border-t">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-1 pt-3">
            <h3 className="font-semibold">Prazos e compromissos da semana</h3>
            <span className="text-[13px] text-muted-foreground">por advogado responsável</span>
          </div>
          {agendaPorAdvogado.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-muted-foreground">Nenhum prazo ou compromisso cadastrado para esta semana.</p>
          ) : (
            <div className="grid gap-x-8 gap-y-4 px-5 pb-4 md:grid-cols-2">
              {agendaPorAdvogado.map((a) => (
                <div key={a.nome}>
                  <div className="font-semibold">
                    {a.nome} <span className="ml-1 font-mono text-xs font-normal text-muted-foreground">{a.itens.length}</span>
                  </div>
                  <ul className="mt-1 space-y-1">
                    {a.itens.map((it, i) => (
                      <li key={i} className="flex items-baseline gap-2 text-[13px]">
                        <span className={cn("w-[72px] shrink-0 font-mono text-xs", it.dia === hoje ? "font-semibold text-brand-navy" : it.dia < hoje ? "text-destructive" : "text-muted-foreground")}>
                          {diaSemanaCurto(it.dia)} {br(it.dia)}
                        </span>
                        <span className={cn("shrink-0 rounded px-1 text-[11px] font-semibold", it.tipo === "prazo" ? "bg-amber-50 text-amber-900" : "bg-accent text-brand-navy")}>
                          {it.rotulo}
                        </span>
                        <Link href={it.href} className="min-w-0 truncate hover:underline" title={it.texto}>{it.texto}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* em pauta esta semana */}
        <div className="border-t">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-1 pt-3">
            <h3 className="font-semibold">
              Em pauta esta semana <span className="ml-1 font-mono text-sm font-semibold text-brand-navy">{itensPauta.length}</span>
            </h3>
            {semCadastro > 0 && (
              <span className="text-[13px] text-muted-foreground">
                {semCadastro} {semCadastro === 1 ? "item ainda não cadastrado" : "itens ainda não cadastrados"} no painel
              </span>
            )}
          </div>
          {itensPauta.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-muted-foreground">
              Nenhum item de pauta cadastrado para esta semana.{" "}
              <Link href="/app/tce/pauta" className="font-medium text-brand-navy hover:underline">Cadastrar pauta →</Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-1.5 font-medium">Processo</th>
                    <th className="px-2 py-1.5 font-medium">Município</th>
                    <th className="px-2 py-1.5 font-medium">Advogado</th>
                    <th className="px-2 py-1.5 font-medium">Situação no painel</th>
                    <th className="px-2 py-1.5 font-medium">Prognóstico</th>
                    <th className="px-5 py-1.5 font-medium">Providência</th>
                  </tr>
                </thead>
                <tbody>
                  {gruposPauta.map((g) => (
                    <Fragment key={g.chave}>
                      <tr className="border-t bg-background">
                        <td colSpan={6} className="px-5 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-brand-navy">
                          {diaSemanaCurto(g.dia)} {br(g.dia)}{g.dia === hoje && " · hoje"} · {TCE_CAMARA_LABELS[g.camara]}
                          <span className="ml-2 font-mono font-normal normal-case text-muted-foreground">{g.itens.length} {g.itens.length === 1 ? "item" : "itens"}</span>
                        </td>
                      </tr>
                      {g.itens.map((it) => (
                        <tr key={it.id} className="border-t">
                          <td className="px-5 py-2.5 align-top">
                            {it.processoTce ? (
                              <Link href={`/app/tce/processos/${it.processoTce.id}`} className="hover:underline">
                                <NumeroProcesso numero={it.numeroProcesso} />
                              </Link>
                            ) : (
                              <NumeroProcesso numero={it.numeroProcesso} />
                            )}
                            {(it.retiradoDePauta || it.pedidoVistas) && (
                              <div className="mt-0.5 flex gap-1">
                                {it.retiradoDePauta && <span className="rounded bg-red-100 px-1 text-[11px] font-semibold text-red-800">retirado de pauta</span>}
                                {it.pedidoVistas && <span className="rounded bg-orange-100 px-1 text-[11px] font-semibold text-orange-800">pedido de vistas</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2.5 align-top">{it.municipio}</td>
                          <td className="px-2 py-2.5 align-top text-[13px] text-muted-foreground">{it.advogadoResp}</td>
                          <td className="px-2 py-2.5 align-top">
                            {it.situacao ? (
                              <>
                                <span className={cn(it.situacao.julgado ? "inline-block rounded border px-1.5 py-0.5 text-xs font-semibold" : "text-[13px]", it.situacao.classe)}>
                                  {it.situacao.texto}
                                </span>
                                {it.selos.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {it.selos.map((s) => (
                                      <span key={s} className="rounded bg-accent px-1 text-[11px] font-semibold text-brand-navy">{s}</span>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-[13px] text-muted-foreground">
                                não cadastrado no painel ·{" "}
                                <Link
                                  href={`/app/tce/processos?q=${encodeURIComponent(it.numeroProcesso)}&situacao=todos`}
                                  className="font-medium text-brand-navy hover:underline"
                                >
                                  cadastrar
                                </Link>
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 align-top text-[13px]">{it.prognostico ?? <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-5 py-2.5 align-top text-[13px]">{it.providencia ?? <span className="text-muted-foreground">—</span>}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* rodape do bloco */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-[13px]">
          <span className="text-muted-foreground">{rodapeSemana}</span>
          <span className="flex gap-4">
            <Link href="/app/tce/pauta" className="font-medium text-brand-navy hover:underline">Ver pauta completa →</Link>
            <Link href="/app/compromissos" className="font-medium text-brand-navy hover:underline">Ver agenda →</Link>
          </span>
        </div>
      </section>

      {/* ------------------------------------------------ prioritarios */}
      <section className="rounded-xl border bg-white" aria-labelledby="prio">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
          <h2 id="prio" className="text-xl font-semibold">
            Processos prioritários <span className="ml-1 font-mono text-sm font-semibold text-brand-navy">{prioritarios.length}</span>
          </h2>
          <span className="text-[13px] text-muted-foreground">improbidade e criminal · em pauta, com prazo, conclusos e parados</span>
        </div>
        {prioritarios.length === 0 ? (
          <p className="border-t px-5 py-4 text-sm text-muted-foreground">Nenhum processo marcado como prioritário.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-1.5 font-medium">Processo</th>
                  <th className="px-2 py-1.5 font-medium">Cliente</th>
                  <th className="px-2 py-1.5 font-medium">Situação</th>
                  <th className="px-2 py-1.5 font-medium">Último movimento</th>
                  <th className="px-5 py-1.5 font-medium">Advogado</th>
                </tr>
              </thead>
              <tbody>
                {gruposPrio.map((g) => (
                  <Fragment key={g.cat}>
                    <tr className="border-t bg-background">
                      <td colSpan={5} className="px-5 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-brand-navy">
                        {CATEGORIA_PRIORITARIO_LABELS[g.cat]}
                        <span className="ml-2 font-mono font-normal normal-case text-muted-foreground">{g.itens.length}</span>
                      </td>
                    </tr>
                    {g.itens.map((p) => (
                      <tr key={p.id} className={cn("border-t", p.destaque && "bg-amber-50/50")}>
                        <td className="px-5 py-2.5 align-top">
                          <Link href={`/app/processos/${p.id}`} className="hover:underline">
                            <NumeroProcesso numero={p.numero} />
                          </Link>
                          <span className="ml-2 rounded border px-1 font-mono text-[11px] text-muted-foreground">{p.tribunal}</span>
                          {p.tipo === "CRIMINAL" && <span className="ml-1 rounded bg-red-100 px-1 text-[11px] font-semibold text-red-800">criminal</span>}
                        </td>
                        <td className="px-2 py-2.5 align-top">{p.cliente}</td>
                        <td className={cn("px-2 py-2.5 align-top text-[13px]", p.destaque && "font-semibold text-brand-navy")}>{p.situacao}</td>
                        <td className="px-2 py-2.5 align-top text-[13px] text-muted-foreground">
                          {p.ultimoMovimento ? (
                            <>
                              <span className="font-mono text-xs">{br(p.ultimoMovimento.dia)}</span> · {p.ultimoMovimento.texto}
                            </>
                          ) : (
                            "—"
                          )}
                          {p.naoLidos > 0 && (
                            <span className="ml-1 rounded bg-accent px-1 font-mono text-[11px] text-brand-navy">{p.naoLidos} não lidos</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 align-top text-[13px] text-muted-foreground">{p.advogado}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {datajudParado != null && datajudUltima && (
          <p className="border-t px-5 py-2 text-[12px] text-muted-foreground">
            Movimentos vindos do DataJud, atualizado pela última vez em {br(diaDe(datajudUltima))} (há {datajudParado} dias); as intimações do DJEN entram assim que publicadas.
          </p>
        )}
      </section>

      {/* ------------------------------------------------ vencidos sem baixa */}
      {vencidos.length > 0 && (
        <section className="rounded-xl border bg-white" aria-labelledby="venc">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
            <h2 id="venc" className="flex items-center gap-2 text-xl font-semibold">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" aria-hidden="true" />
              Prazos vencidos sem baixa
              <span className="font-mono text-sm font-semibold text-destructive">{vencidos.length}</span>
            </h2>
            <span className="text-[13px] text-muted-foreground">Marque como cumprido ou encerre como perdido.</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <tbody>
                {vencidos.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="w-28 px-5 py-3 align-top">
                      <span className="font-mono text-[13px] font-semibold text-destructive">há {diasEntre(v.dia, hoje)} dias</span>
                      <div className="text-xs text-muted-foreground">venceu {br(v.dia)}</div>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div className="font-semibold">{v.tipo}</div>
                      <Link href={v.href} className="mr-2 hover:underline">
                        <NumeroProcesso numero={v.numero} />
                      </Link>
                      <span className="text-[13px] text-muted-foreground">{v.contexto}</span>
                    </td>
                    <td className="hidden px-2 py-3 align-top text-[13px] text-muted-foreground md:table-cell">{v.resp ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right align-top">
                      <HojePrazoAcoes prazoId={v.id} escopo={v.escopo} usuarioId={user.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ regua 14 dias */}
      <section className="rounded-xl border bg-white" aria-labelledby="regua">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
          <h2 id="regua" className="text-xl font-semibold">Próximos 14 dias</h2>
          <span className="text-[13px] text-muted-foreground">
            {br(hoje)} a {br(fimRegua)} · prazos, sessões de pauta e compromissos
          </span>
        </div>
        <div className="overflow-x-auto border-t">
          <div className="grid min-w-[980px] grid-cols-[repeat(14,minmax(0,1fr))]">
            {dias.map((d) => {
              const dt = new Date(`${d}T12:00:00Z`);
              const fds = dt.getUTCDay() === 0 || dt.getUTCDay() === 6;
              const itens = regua.get(d) ?? [];
              return (
                <div key={d} className={cn("min-h-[120px] border-l px-1.5 pb-2 pt-2 first:border-l-0", fds && "bg-background", d === hoje && "bg-accent")}>
                  <div className="text-center">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{d === hoje ? "hoje" : SEMANA[dt.getUTCDay()]}</div>
                    <div className="font-mono text-[15px] font-medium">{dt.getUTCDate()}</div>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {itens.slice(0, 3).map((it, i) => (
                      <Link
                        key={i}
                        href={it.href}
                        title={it.texto}
                        className={cn(
                          "block truncate rounded px-1 py-0.5 text-[10.5px] leading-tight",
                          it.tipo === "prazo" && "bg-amber-50 text-amber-900",
                          it.tipo === "sessao" && "bg-brand-navy text-white",
                          it.tipo === "compromisso" && "bg-accent text-brand-navy",
                        )}
                      >
                        {it.texto}
                      </Link>
                    ))}
                    {itens.length > 3 && <div className="text-center text-[10.5px] text-muted-foreground">+{itens.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {totalRegua === 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-sm">
            <span>Nenhum prazo, sessão de pauta ou compromisso cadastrado no período.</span>
            <Link href="/app/tce/pauta" className="font-medium text-brand-navy hover:underline">Cadastrar pauta da semana →</Link>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------ fila de trabalho (secundaria) */}
        <section className="rounded-xl border bg-white" aria-labelledby="fila">
          <div className="flex items-baseline justify-between gap-2 px-5 pb-2 pt-4">
            <h2 id="fila" className="text-base font-semibold">Fila de trabalho TCE</h2>
            <Link href="/app/tce/pendencias" className="text-[13px] font-medium text-brand-navy hover:underline">Pendências →</Link>
          </div>
          <div className="grid grid-cols-2 gap-px border-t bg-border">
            {fila.map((f) => (
              <Link key={f.t} href={f.href} className="bg-white px-5 py-3 transition-colors hover:bg-background" title={f.d}>
                <span className="block font-mono text-xl font-medium">{f.n}</span>
                <span className="block text-[13px] font-medium">{f.t}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------ novidades judiciais */}
        <section className="rounded-xl border bg-white" aria-labelledby="nov">
          <div className="flex items-baseline justify-between gap-2 px-5 pb-2 pt-4">
            <h2 id="nov" className="text-xl font-semibold">Novidades nos judiciais</h2>
            <Link href="/app/monitoramento" className="text-[13px] font-medium text-brand-navy hover:underline">
              {novidadesGrupo.length} {novidadesGrupo.length === 1 ? "processo" : "processos"} →
            </Link>
          </div>
          {intimacoes.map((i) => (
            <Link key={i.id} href={`/app/processos/${i.processo.id}`} className="block border-t border-l-4 border-l-brand-navy px-5 py-3 transition-colors hover:bg-background">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  <NumeroProcesso numero={i.processo.numero} />
                  <span className="ml-2 rounded border px-1 font-mono text-[11px] text-muted-foreground">{i.processo.tribunal}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">{br(diaDe(i.dataPublicacao))}</span>
              </div>
              <div className="mt-0.5 font-semibold">
                <span className="mr-2 rounded bg-brand-navy px-1.5 text-[11px] font-semibold uppercase tracking-wide text-white">{i.tipoComunicacao || "Intimação"}</span>
                Publicada no DJEN
              </div>
              <div className="line-clamp-2 text-[13px] text-muted-foreground">
                {i.processo.gestor?.nome ?? "—"} · {resumoDe(i.conteudo ?? "", 180)}
              </div>
            </Link>
          ))}
          {novidades.length === 0 && intimacoes.length === 0 && <p className="border-t px-5 py-4 text-sm text-muted-foreground">Nenhuma novidade não lida.</p>}
          {novidades.map(({ g, p }) => {
            const ult = p!.movimentacoesAuto[0];
            return (
              <Link key={g.processoId} href={`/app/processos/${p!.id}`} className="block border-t px-5 py-3 transition-colors hover:bg-background">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    <NumeroProcesso numero={p!.numero} />
                    <span className="ml-2 rounded border px-1 font-mono text-[11px] text-muted-foreground">{p!.tribunal}</span>
                  </span>
                  {ult && <span className="font-mono text-xs text-muted-foreground">{br(diaDe(ult.dataMovimento))}</span>}
                </div>
                <div className="mt-0.5 font-semibold">{ult?.nomeMovimento ?? "Movimentação"}</div>
                <div className="text-[13px] text-muted-foreground">
                  {p!.gestor?.nome ?? "—"} · {g._count._all} {g._count._all === 1 ? "movimento não lido" : "movimentos não lidos"}
                </div>
              </Link>
            );
          })}
          {datajudParado != null && datajudUltima && (
            <p className="border-t px-5 py-2 text-[12px] text-muted-foreground">
              DataJud atualizado pela última vez em {br(diaDe(datajudUltima))} (há {datajudParado} dias).
            </p>
          )}
        </section>
      </div>

    </div>
  );
}
