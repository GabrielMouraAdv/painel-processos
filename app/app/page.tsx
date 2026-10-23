import Link from "next/link";
import { Fragment } from "react";
import { getServerSession } from "next-auth";
import type { CamaraTce } from "@prisma/client";

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

// Inicio "Pauta de hoje" (Direcao A), na ordem que os socios leem: o painel do dia,
// a faixa da semana (prazos e compromissos por advogado, tres semanas com rolagem),
// a pauta do TCE-PE da semana, os processos prioritarios, os vencidos sem baixa e,
// por fim, a fila de trabalho e as novidades judiciais.

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
const diaSemanaCurto = (iso: string) => SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const fimDeSemana = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return d === 0 || d === 6;
};

// Cores por camara (as mesmas do Dashboard TCE), para diferenciar bem Primeira, Segunda e Pleno.
const CAMARA_COR: Record<CamaraTce, { chip: string; faixa: string; curto: string }> = {
  PRIMEIRA: { chip: "bg-[#1e40af] text-white", faixa: "border-l-[#1e40af] bg-blue-50 text-blue-950", curto: "1ª Câmara" },
  SEGUNDA: { chip: "bg-[#047857] text-white", faixa: "border-l-[#047857] bg-emerald-50 text-emerald-950", curto: "2ª Câmara" },
  PLENO: { chip: "bg-[#6b21a8] text-white", faixa: "border-l-[#6b21a8] bg-purple-50 text-purple-950", curto: "Pleno" },
};

// Cores por categoria dos prioritarios.
const PRIO_COR: Record<CategoriaPrioritario, string> = {
  em_pauta: "border-l-[#6b21a8] bg-purple-50 text-purple-950",
  prazo_aberto: "border-l-amber-600 bg-amber-50 text-amber-950",
  concluso: "border-l-sky-700 bg-sky-50 text-sky-950",
  parado: "border-l-slate-400 bg-slate-100 text-slate-700",
};

// Tipos de compromisso (lib/schemas.ts) com rotulo de exibicao.
const COMPROMISSO_TIPO_LABEL: Record<string, string> = {
  REUNIAO: "Reunião",
  AUDIENCIA: "Audiência",
  SUSTENTACAO: "Sustentação oral",
  DESPACHO_PRESENCIAL: "Despacho presencial",
  VIAGEM: "Viagem",
  PESSOAL: "Pessoal",
  OUTRO: "Compromisso",
};

// Socios com linha propria na faixa da semana; os demais responsaveis entram em "Outros".
const SOCIOS = [
  { chave: "gabriel", rotulo: "Gabriel", iniciais: "GM", teste: /gabriel/i },
  { chave: "henrique", rotulo: "Henrique", iniciais: "HA", teste: /henrique/i },
  { chave: "heloisa", rotulo: "Heloísa", iniciais: "HC", teste: /helo[ií]sa/i },
];
type LinhaFaixa = { chave: string; rotulo: string; sub?: string; iniciais?: string };
type ItemFaixa = { texto: string; detalhe: string; href: string; classe: string };

export default async function HojePage() {
  const session = await getServerSession(authOptions);
  const user = session!.user;
  const escritorioId = user.escritorioId;

  const hoje = hojeDia();

  // Semana corrente (segunda a domingo) e a faixa de tres semanas (esta e as duas seguintes).
  const semIni = startOfWeekUTC(new Date(`${hoje}T12:00:00Z`));
  const semFim = endOfWeekUTC(semIni);
  const semIniDia = semIni.toISOString().slice(0, 10);
  const semFimDia = semFim.toISOString().slice(0, 10);
  const naSemana = (dia: string) => dia >= semIniDia && dia <= semFimDia;
  const diasFaixa = Array.from({ length: 21 }, (_, i) => somaDias(semIniDia, i));
  const fimFaixaDia = diasFaixa[diasFaixa.length - 1];
  const iniBusca = new Date(`${somaDias(semIniDia, -1)}T00:00:00Z`);
  const fimBusca = new Date(`${somaDias(fimFaixaDia, 1)}T23:59:59Z`);

  const [
    prazosTce, prazosJud, compromissos,
    emJulgamentoSemMemorial, contrarrazoesPendentes, recursoPendente, situacaoConfirmar,
    novidadesGrupo,
    itensSemana,
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
    // Compromissos da faixa (com folga de um dia; o dia certo e conferido por diaDe).
    prisma.compromisso.findMany({
      where: { escritorioId, cumprido: false, dataInicio: { gte: iniBusca, lte: fimBusca }, ...filtroVisibilidadeCompromissos(user) },
      orderBy: { dataInicio: "asc" },
      select: { id: true, titulo: true, tipo: true, dataInicio: true, advogado: { select: { nome: true } } },
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

  // ---------------------------------------------------------------- faixa da semana (por advogado)
  // So os compromissos e prazos dos advogados: a pauta do TCE-PE tem o proprio bloco logo abaixo.
  const linhasFaixa: LinhaFaixa[] = [
    ...SOCIOS.map((s) => ({ chave: s.chave, rotulo: s.rotulo, iniciais: s.iniciais })),
    { chave: "outros", rotulo: "Outros", sub: "demais responsáveis" },
  ];
  const faixa = new Map<string, Map<string, ItemFaixa[]>>();
  const poeFaixa = (linha: string, dia: string, item: ItemFaixa) => {
    if (dia < semIniDia || dia > fimFaixaDia) return;
    if (!faixa.has(linha)) faixa.set(linha, new Map());
    const porDia = faixa.get(linha)!;
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia)!.push(item);
  };
  const linhaDe = (nome: string | null | undefined) => SOCIOS.find((s) => nome && s.teste.test(nome))?.chave ?? "outros";
  const classePrazo = (dia: string) =>
    dia < hoje ? "bg-red-50 text-red-900 ring-1 ring-red-200" : "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
  for (const p of prazosTce) {
    const d = diaDe(p.dataVencimento);
    poeFaixa(linhaDe(p.advogadoResp?.nome), d, {
      texto: `${p.tipo} · ${p.processo.numero}`,
      detalhe: `Prazo TCE · ${p.tipo} · ${p.processo.numero}${p.advogadoResp ? ` · ${p.advogadoResp.nome}` : ""}`,
      href: `/app/tce/processos/${p.processo.id}`, classe: classePrazo(d),
    });
  }
  for (const p of prazosJud) {
    const d = diaDe(p.data);
    poeFaixa(linhaDe(p.advogadoResp?.nome), d, {
      texto: `${p.tipo} · ${p.processo.numero}`,
      detalhe: `Prazo judicial · ${p.tipo} · ${p.processo.numero}${p.advogadoResp ? ` · ${p.advogadoResp.nome}` : ""}`,
      href: `/app/processos/${p.processo.id}`, classe: classePrazo(d),
    });
  }
  for (const c of compromissos) {
    const d = diaDe(c.dataInicio);
    poeFaixa(linhaDe(c.advogado.nome), d, {
      texto: c.titulo,
      detalhe: `${COMPROMISSO_TIPO_LABEL[c.tipo] ?? "Compromisso"} · ${c.titulo} · ${c.advogado.nome}`,
      href: "/app/compromissos", classe: "bg-violet-50 text-violet-900 ring-1 ring-violet-200",
    });
  }
  const itensLinha = (chave: string) => Array.from(faixa.get(chave)?.values() ?? []).flat();
  const linhasVisiveis = linhasFaixa.filter((l) => l.chave !== "outros" || itensLinha("outros").length > 0);
  const colunasFaixa = diasFaixa.map((d) => (fimDeSemana(d) ? "72px" : "148px")).join(" ");

  const prazosSemana = [...prazosTce.map((p) => diaDe(p.dataVencimento)), ...prazosJud.map((p) => diaDe(p.data))].filter(naSemana).length;
  const compromissosSemana = compromissos.filter((c) => naSemana(diaDe(c.dataInicio))).length;

  // ---------------------------------------------------------------- pauta do TCE-PE da semana
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
  type GrupoPauta = { chave: string; dia: string; camara: CamaraTce; itens: typeof itensPauta };
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
  const prioEmMovimento = nPrio("em_pauta") + nPrio("prazo_aberto") + nPrio("concluso");

  // ---------------------------------------------------------------- cabecalho
  const dHoje = new Date(`${hoje}T12:00:00Z`);
  const titulo = `${DIAS_SEMANA[dHoje.getUTCDay()]}, ${dHoje.getUTCDate()} de ${MESES[dHoje.getUTCMonth()]}`;
  const indicadores = [
    { n: prazosSemana + compromissosSemana, t: "prazos e compromissos na semana", href: "#semana", alerta: false },
    { n: itensPauta.length, t: "processos em pauta no TCE-PE", href: "#pauta", alerta: false },
    { n: prioEmMovimento, t: "prioritários em pauta, com prazo ou conclusos", href: "#prio", alerta: false },
    { n: vencidos.length, t: "prazos vencidos sem baixa", href: "#venc", alerta: vencidos.length > 0 },
  ];

  const fila = [
    { n: emJulgamentoSemMemorial, t: "Em julgamento sem memorial", d: "TCE · nenhum memorial pronto ou dispensado", href: "/app/tce/processos?situacao=em_julgamento" },
    { n: contrarrazoesPendentes, t: "Contrarrazões pendentes", d: "TCE · Nota Técnica ou Parecer do MPCO sem resposta", href: "/app/tce/pendencias" },
    { n: recursoPendente, t: "Julgados com recurso pendente", d: "TCE · aguardando o julgamento do recurso", href: "/app/tce/processos?situacao=recurso_pendente" },
    { n: situacaoConfirmar, t: "Processos sem nenhum andamento", d: "TCE · falta carregar a linha do tempo", href: "/app/tce/processos" },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:gap-6 md:px-10 md:py-8">
      {/* ------------------------------------------------ painel do dia */}
      <header className="relative overflow-hidden rounded-2xl bg-brand-navy px-5 py-5 text-white shadow-sm md:px-8 md:py-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/[0.06]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 right-40 h-72 w-72 rounded-full bg-white/[0.05]" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/60">Pauta do escritório</p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight text-white md:text-4xl">{titulo}</h1>
          <p className="mt-2 text-[15px] text-white/75">Semana de {br(semIniDia)} a {br(semFimDia)}.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {indicadores.map((i) => (
              <a key={i.t} href={i.href} className="rounded-xl bg-white/10 px-4 py-3 transition-colors hover:bg-white/[0.16]">
                <span className={cn("block font-mono text-2xl font-medium leading-none", i.alerta && "text-red-200")}>{i.n}</span>
                <span className="mt-1.5 block text-[12px] leading-snug text-white/75">{i.t}</span>
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------ faixa da semana */}
      <section id="semana" className="scroll-mt-6 rounded-xl border bg-white" aria-labelledby="semana-t">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
          <h2 id="semana-t" className="text-xl font-semibold">Semana</h2>
          <span className="text-[13px] text-muted-foreground">
            {br(semIniDia)} a {br(fimFaixaDia)} · prazos e compromissos por advogado · role para o lado para ver as próximas semanas
          </span>
        </div>
        <div className="overflow-x-auto border-t">
          <div className="grid [--col-nome:112px] md:[--col-nome:156px]" style={{ gridTemplateColumns: `var(--col-nome) ${colunasFaixa}` }}>
            {/* cabecalho dos dias */}
            <div className="sticky left-0 z-20 border-b bg-white" />
            {diasFaixa.map((d, i) => {
              const dt = new Date(`${d}T12:00:00Z`);
              const segunda = dt.getUTCDay() === 1;
              return (
                <div
                  key={d}
                  className={cn(
                    "border-b border-l px-1 py-2 text-center",
                    segunda && i > 0 && "border-l-2 border-l-slate-300",
                    fimDeSemana(d) && "bg-background",
                    d === hoje && "bg-accent",
                  )}
                >
                  <div className={cn("text-[10.5px] uppercase tracking-wide", d === hoje ? "font-semibold text-brand-navy" : "text-muted-foreground")}>
                    {d === hoje ? "hoje" : diaSemanaCurto(d)}
                  </div>
                  <div className={cn("font-mono text-[15px] font-medium leading-tight", d === hoje && "text-brand-navy")}>
                    {dt.getUTCDate()}
                    {(i === 0 || dt.getUTCDate() === 1) && <span className="text-[11px] text-muted-foreground">/{String(dt.getUTCMonth() + 1).padStart(2, "0")}</span>}
                  </div>
                </div>
              );
            })}

            {/* uma linha por advogado (e a da pauta) */}
            {linhasVisiveis.map((l) => (
              <Fragment key={l.chave}>
                <div className="sticky left-0 z-10 flex items-center gap-2 border-b bg-white px-2 py-2.5 shadow-[1px_0_0_hsl(var(--border))] md:gap-2.5 md:px-4">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold md:h-8 md:w-8 md:text-[11px]",
                      l.iniciais ? "bg-brand-navy text-white" : "bg-accent text-brand-navy",
                    )}
                    aria-hidden="true"
                  >
                    {l.iniciais ?? "+"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold md:text-sm">{l.rotulo}</span>
                    {l.sub && <span className="hidden truncate text-[11px] text-muted-foreground md:block">{l.sub}</span>}
                  </span>
                </div>
                {itensLinha(l.chave).length === 0 && (
                  <div className="flex min-h-[58px] items-center border-b border-l px-4 text-[12px] italic text-muted-foreground" style={{ gridColumn: "2 / span 7" }}>
                    Nenhum prazo ou compromisso cadastrado nestas três semanas.
                  </div>
                )}
                {(itensLinha(l.chave).length === 0 ? diasFaixa.slice(7) : diasFaixa).map((d) => {
                    const i = diasFaixa.indexOf(d);
                    const itens = faixa.get(l.chave)?.get(d) ?? [];
                    const segunda = new Date(`${d}T12:00:00Z`).getUTCDay() === 1;
                    return (
                      <div
                        key={d}
                        className={cn(
                          "min-h-[58px] space-y-1 border-b border-l p-1",
                          segunda && i > 0 && "border-l-2 border-l-slate-300",
                          fimDeSemana(d) && "bg-background",
                          d === hoje && "bg-accent/60",
                        )}
                      >
                        {itens.slice(0, 3).map((it, k) => (
                          <Link key={k} href={it.href} title={it.detalhe} className={cn("block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight", it.classe)}>
                            {it.texto}
                          </Link>
                        ))}
                        {itens.length > 3 && <div className="text-center text-[10.5px] text-muted-foreground">+{itens.length - 3}</div>}
                      </div>
                    );
                  })}
              </Fragment>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2.5 text-[13px]">
          <span className="text-muted-foreground">
            Esta semana: {prazosSemana} {prazosSemana === 1 ? "prazo" : "prazos"} · {compromissosSemana} {compromissosSemana === 1 ? "compromisso" : "compromissos"} · agenda do Legal One e prazos do painel
          </span>
          <span className="flex gap-4">
            <Link href="/app/compromissos" className="font-medium text-brand-navy hover:underline">Ver agenda →</Link>
            <Link href="/app/tce/prazos?status=aberto" className="font-medium text-brand-navy hover:underline">Ver prazos TCE →</Link>
          </span>
        </div>
      </section>

      {/* ------------------------------------------------ pauta do TCE-PE da semana */}
      <section id="pauta" className="scroll-mt-6 rounded-xl border bg-white" aria-labelledby="pauta-t">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
          <h2 id="pauta-t" className="text-xl font-semibold">
            Em pauta no TCE-PE <span className="ml-1 font-mono text-sm font-semibold text-brand-navy">{itensPauta.length}</span>
          </h2>
          <span className="text-[13px] text-muted-foreground">
            {br(semIniDia)} a {br(semFimDia)}
            {semCadastro > 0 && ` · ${semCadastro} ${semCadastro === 1 ? "item ainda não cadastrado" : "itens ainda não cadastrados"} no painel`}
          </span>
        </div>
        {itensPauta.length === 0 ? (
          <p className="border-t px-5 py-4 text-sm text-muted-foreground">
            Nenhum item de pauta cadastrado para esta semana.{" "}
            <Link href="/app/tce/pauta" className="font-medium text-brand-navy hover:underline">Cadastrar pauta →</Link>
          </p>
        ) : (
          <div className="max-h-[400px] overflow-auto border-t">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10 bg-white shadow-[inset_0_-1px_0_hsl(var(--border))]">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="sticky left-0 z-[1] bg-white px-3 py-2 font-medium shadow-[1px_0_0_hsl(var(--border))] md:px-5">Processo</th>
                  <th className="px-2 py-2 font-medium">Município</th>
                  <th className="px-2 py-2 font-medium">Advogado</th>
                  <th className="px-2 py-2 font-medium">Situação no painel</th>
                  <th className="px-2 py-2 font-medium">Prognóstico</th>
                  <th className="px-5 py-2 font-medium">Providência</th>
                </tr>
              </thead>
              <tbody>
                {gruposPauta.map((g) => (
                  <Fragment key={g.chave}>
                    <tr className={cn("border-l-4", CAMARA_COR[g.camara].faixa)}>
                      <td colSpan={6} className="px-4 py-1.5">
                        <div className="sticky left-4 inline-flex flex-wrap items-center">
                        <span className={cn("mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", CAMARA_COR[g.camara].chip)}>
                          {TCE_CAMARA_LABELS[g.camara]}
                        </span>
                        <span className="text-[12px] font-semibold uppercase tracking-wide">
                          {diaSemanaCurto(g.dia)} {br(g.dia)}{g.dia === hoje && " · hoje"}
                        </span>
                        <span className="ml-2 font-mono text-[12px] opacity-70">{g.itens.length} {g.itens.length === 1 ? "item" : "itens"}</span>
                        </div>
                      </td>
                    </tr>
                    {g.itens.map((it) => (
                      <tr key={it.id} className="border-t">
                        <td className="sticky left-0 z-[1] bg-white px-3 py-2.5 align-top shadow-[1px_0_0_hsl(var(--border))] md:px-5">
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2.5 text-[13px]">
          <span className="flex flex-wrap gap-3 text-muted-foreground">
            {(Object.keys(CAMARA_COR) as CamaraTce[]).map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5">
                <span className={cn("inline-block h-2.5 w-2.5 rounded-full", CAMARA_COR[c].chip)} aria-hidden="true" />
                {TCE_CAMARA_LABELS[c]}
              </span>
            ))}
          </span>
          <Link href="/app/tce/pauta" className="font-medium text-brand-navy hover:underline">Ver pauta completa →</Link>
        </div>
      </section>

      {/* ------------------------------------------------ prioritarios */}
      <section id="prio" className="scroll-mt-6 rounded-xl border bg-white" aria-labelledby="prio-t">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
          <h2 id="prio-t" className="text-xl font-semibold">
            Processos prioritários <span className="ml-1 font-mono text-sm font-semibold text-brand-navy">{prioritarios.length}</span>
          </h2>
          <span className="text-[13px] text-muted-foreground">
            improbidade e criminal · {nPrio("em_pauta")} em pauta · {nPrio("prazo_aberto")} com prazo · {nPrio("concluso")} conclusos · {nPrio("parado")} parados
          </span>
        </div>
        {prioritarios.length === 0 ? (
          <p className="border-t px-5 py-4 text-sm text-muted-foreground">Nenhum processo marcado como prioritário.</p>
        ) : (
          <div className="max-h-[440px] overflow-auto border-t">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="sticky top-0 z-10 bg-white shadow-[inset_0_-1px_0_hsl(var(--border))]">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="sticky left-0 z-[1] bg-white px-3 py-2 font-medium shadow-[1px_0_0_hsl(var(--border))] md:px-5">Processo</th>
                  <th className="px-2 py-2 font-medium">Cliente</th>
                  <th className="px-2 py-2 font-medium">Situação</th>
                  <th className="px-2 py-2 font-medium">Último movimento</th>
                  <th className="px-5 py-2 font-medium">Advogado</th>
                </tr>
              </thead>
              <tbody>
                {gruposPrio.map((g) => (
                  <Fragment key={g.cat}>
                    <tr className={cn("border-l-4", PRIO_COR[g.cat])}>
                      <td colSpan={5} className="px-4 py-1.5 text-[12px] font-semibold uppercase tracking-wide">
                        <div className="sticky left-4 inline-block">
                        {CATEGORIA_PRIORITARIO_LABELS[g.cat]}
                        <span className="ml-2 font-mono font-normal normal-case opacity-70">{g.itens.length}</span>
                        </div>
                      </td>
                    </tr>
                    {g.itens.map((p) => (
                      <tr key={p.id} className={cn("border-t", p.destaque && "bg-amber-50/50")}>
                        <td className={cn("sticky left-0 z-[1] px-3 py-2.5 align-top shadow-[1px_0_0_hsl(var(--border))] md:px-5", p.destaque ? "bg-amber-50" : "bg-white")}>
                          <Link href={`/app/processos/${p.id}`} className="hover:underline">
                            <NumeroProcesso numero={p.numero} />
                          </Link>
                          <span className="ml-2 rounded border px-1 font-mono text-[11px] text-muted-foreground">{p.tribunal}</span>
                          {p.tipo === "CRIMINAL" && <span className="ml-1 rounded bg-red-100 px-1 text-[11px] font-semibold text-red-800">criminal</span>}
                        </td>
                        <td className="px-2 py-2.5 align-top">{p.cliente}</td>
                        <td className="px-2 py-2.5 align-top text-[13px]">
                          <span className={cn(p.destaque && "font-semibold text-brand-navy")}>{p.situacao}</span>
                          {p.ultimaPeca && (
                            <div className="mt-0.5 text-[12px] text-muted-foreground">
                              Última peça: <span className="font-medium text-foreground">{p.ultimaPeca.texto}</span> · <span className="font-mono text-[11px]">{br(p.ultimaPeca.dia)}</span>
                            </div>
                          )}
                        </td>
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
        <p className="border-t px-5 py-2 text-[12px] text-muted-foreground">
          Conclusão para despacho é rotina do cartório e não entra entre os conclusos. A última peça vem do nome do movimento e pode ser de corréu: confirme nos autos.
          {datajudParado != null && datajudUltima && (
            <> Movimentos vindos do DataJud, atualizado pela última vez em {br(diaDe(datajudUltima))} (há {datajudParado} dias); as intimações do DJEN entram assim que publicadas.</>
          )}
        </p>
      </section>

      {/* ------------------------------------------------ vencidos sem baixa */}
      {vencidos.length > 0 && (
        <section id="venc" className="scroll-mt-6 rounded-xl border bg-white" aria-labelledby="venc-t">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-2 pt-4">
            <h2 id="venc-t" className="flex items-center gap-2 text-xl font-semibold">
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
                    <td className="sticky left-0 z-[1] w-28 bg-white px-3 py-3 align-top shadow-[1px_0_0_hsl(var(--border))] md:px-5">
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
            <h2 id="nov" className="text-base font-semibold">Novidades nos judiciais</h2>
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
