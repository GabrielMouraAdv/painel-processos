import Link from "next/link";
import { getServerSession } from "next-auth";
import { CamaraTce, Role } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gavel,
  Plus,
  Scale,
  StickyNote,
  UserCheck,
} from "lucide-react";

import { BancaFilter } from "@/components/bancas/banca-filter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { parseBancasParam } from "@/lib/bancas";
import { diasUteisEntre } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import {
  addDaysIso,
  endOfWeekUTC,
  formatDayMonthBR,
  isoDay,
  parseISODate,
  inicioSemanaPauta,
  startOfWeekUTC,
} from "@/lib/semana";
import { TCE_CAMARA_LABELS, faseTceLabel } from "@/lib/tce-config";
import { cn } from "@/lib/utils";
import { PaginaCabecalho } from "@/components/pagina-cabecalho";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

function countdownUteis(dias: number): string {
  if (dias < 0) return `vencido ${-dias}d`;
  if (dias === 0) return "hoje";
  if (dias === 1) return "1 dia util";
  return `${dias} dias uteis`;
}

function formatDiaSemana(iso: string): string {
  const d = parseISODate(iso.slice(0, 10));
  if (!d) return iso;
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${weekdays[d.getUTCDay()]} ${day}/${month}`;
}

const CAMARA_ACCENT: Record<
  CamaraTce,
  { badge: string; border: string; bg: string }
> = {
  PRIMEIRA: {
    badge: "bg-[#1e40af] text-white",
    border: "border-l-[#1e40af]",
    bg: "bg-blue-50",
  },
  SEGUNDA: {
    badge: "bg-[#047857] text-white",
    border: "border-l-[#047857]",
    bg: "bg-emerald-50",
  },
  PLENO: {
    badge: "bg-[#6b21a8] text-white",
    border: "border-l-[#6b21a8]",
    bg: "bg-purple-50",
  },
};

const CAMARA_ORDER: CamaraTce[] = ["PRIMEIRA", "PLENO", "SEGUNDA"];

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function TceDashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;
  const userId = session!.user.id;
  const isAdvogado = session!.user.role === Role.ADVOGADO;

  const semanaParam = asString(searchParams.pautaSemana);
  // Sem semana escolhida, a pauta "atual" (a partir de sexta, a da semana seguinte).
  const ref = parseISODate(semanaParam);
  const weekStart = ref ? startOfWeekUTC(ref) : inicioSemanaPauta();
  const weekEnd = endOfWeekUTC(weekStart);
  const weekStartIso = isoDay(weekStart);
  const weekEndIso = isoDay(weekEnd);
  const prevWeek = addDaysIso(weekStartIso, -7);
  const nextWeek = addDaysIso(weekStartIso, 7);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em15Corridos = new Date(hoje);
  em15Corridos.setDate(em15Corridos.getDate() + 15);
  em15Corridos.setHours(23, 59, 59, 999);

  const bancasFiltro = parseBancasParam(searchParams.banca);
  const base = {
    escritorioId,
    ...(bancasFiltro.length > 0 && {
      bancasSlug: { hasSome: bancasFiltro },
    }),
  };

  const [
    total,
    comPrazoAberto,
    emPauta,
    memoriaisPendentes,
    contrarrazoesNt,
    contrarrazoesMpco,
    semDespacho,
    contrarrazoesNtPend,
    contrarrazoesMpcoPend,
    despachosPend,
    prazosVencendoCandidatos,
    proximosPrazos,
    ultimosAndamentos,
    meusPrazos,
    sessoesSemana,
  ] = await Promise.all([
    prisma.processoTce.count({ where: base }),
    prisma.processoTce.count({
      where: {
        ...base,
        prazos: { some: { cumprido: false, dispensado: false } },
      },
    }),
    // Itens da pauta da semana corrente (a mesma semana do card "Pauta" abaixo).
    prisma.itemPauta.count({
      where: {
        sessao: { escritorioId, data: { gte: weekStart, lte: weekEnd } },
        ...(bancasFiltro.length > 0 && {
          processoTce: { bancasSlug: { hasSome: bancasFiltro } },
        }),
      },
    }),
    prisma.processoTce.count({
      where: {
        ...base,
        julgado: false,
        memorialPronto: false,
        memorialDispensado: false,
        faseAtual: { notIn: ["transitado", "transitado_cautelar"] },
        tipo: {
          notIn: ["TERMO_AJUSTE_GESTAO", "PEDIDO_RESCISAO", "CONSULTA"],
        },
        OR: [
          { memorialAgendadoData: { not: null } },
          {
            prazos: {
              some: {
                cumprido: false,
                dispensado: false,
                tipo: { contains: "memorial", mode: "insensitive" },
              },
            },
          },
        ],
      },
    }),
    prisma.processoTce.count({
      where: {
        ...base,
        julgado: false,
        notaTecnica: true,
        contrarrazoesNtApresentadas: false,
      },
    }),
    prisma.processoTce.count({
      where: {
        ...base,
        julgado: false,
        parecerMpco: true,
        contrarrazoesMpcoApresentadas: false,
      },
    }),
    prisma.processoTce.count({
      where: {
        ...base,
        julgado: false,
        despachadoComRelator: false,
        despachoDispensado: false,
        tipo: {
          notIn: ["TERMO_AJUSTE_GESTAO", "PEDIDO_RESCISAO", "CONSULTA"],
        },
        OR: [
          { despachoAgendadoData: { not: null } },
          { memorialPronto: true },
          {
            prazos: {
              some: {
                cumprido: false,
                dispensado: false,
                tipo: { contains: "despacho", mode: "insensitive" },
              },
            },
          },
        ],
      },
    }),
    prisma.processoTce.count({
      where: {
        ...base,
        julgado: false,
        notaTecnica: true,
        contrarrazoesNtApresentadas: false,
      },
    }),
    prisma.processoTce.count({
      where: {
        ...base,
        julgado: false,
        parecerMpco: true,
        contrarrazoesMpcoApresentadas: false,
      },
    }),
    prisma.processoTce.count({
      where: {
        ...base,
        julgado: false,
        despachadoComRelator: false,
        despachoDispensado: false,
        tipo: {
          notIn: ["TERMO_AJUSTE_GESTAO", "PEDIDO_RESCISAO", "CONSULTA"],
        },
        OR: [
          { despachoAgendadoData: { not: null } },
          { memorialPronto: true },
          {
            prazos: {
              some: {
                cumprido: false,
                dispensado: false,
                tipo: { contains: "despacho", mode: "insensitive" },
              },
            },
          },
        ],
      },
    }),
    prisma.prazoTce.findMany({
      where: {
        cumprido: false,
        dispensado: false,
        processo: base,
        dataVencimento: { lte: em15Corridos },
      },
      select: { dataVencimento: true },
    }),
    prisma.prazoTce.findMany({
      where: {
        cumprido: false,
        dispensado: false,
        processo: base,
      },
      orderBy: { dataVencimento: "asc" },
      take: 5,
      include: {
        advogadoResp: { select: { id: true, nome: true } },
        processo: {
          select: {
            id: true,
            numero: true,
            tipo: true,
            municipio: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.andamentoTce.findMany({
      where: { processo: base },
      orderBy: { data: "desc" },
      take: 5,
      include: {
        autor: { select: { nome: true } },
        processo: {
          select: {
            id: true,
            numero: true,
            tipo: true,
            municipio: { select: { nome: true } },
          },
        },
      },
    }),
    isAdvogado
      ? prisma.prazoTce.findMany({
          where: {
            cumprido: false,
            dispensado: false,
            advogadoRespId: userId,
            processo: base,
          },
          orderBy: { dataVencimento: "asc" },
          take: 8,
          include: {
            processo: {
              select: {
                id: true,
                numero: true,
                municipio: { select: { nome: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.sessaoPauta.findMany({
      where: {
        escritorioId,
        data: { gte: weekStart, lte: weekEnd },
      },
      orderBy: [{ data: "asc" }, { camara: "asc" }],
      include: {
        _count: { select: { itens: true } },
        itens: {
          orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
          take: 3,
          select: {
            id: true,
            numeroProcesso: true,
            municipio: true,
          },
        },
      },
    }),
  ]);

  const prazosVencendoCount = prazosVencendoCandidatos.filter(
    (p) => diasUteisEntre(hoje, p.dataVencimento) <= 7,
  ).length;
  const totalPendencias =
    contrarrazoesNtPend +
    contrarrazoesMpcoPend +
    memoriaisPendentes +
    despachosPend +
    prazosVencendoCount;

  const kpis: {
    label: string;
    value: number;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: "navy" | "red" | "orange" | "slate" | "violet" | "emerald" | "rose";
  }[] = [
    {
      label: "Pendências",
      value: totalPendencias,
      href: "/app/tce/pendencias",
      icon: AlertTriangle,
      tone: "rose",
    },
    {
      label: "Total TCE",
      value: total,
      href: "/app/tce/processos",
      icon: FileText,
      tone: "navy",
    },
    {
      label: "Prazos abertos",
      value: comPrazoAberto,
      href: "/app/tce/prazos?status=aberto",
      icon: CalendarClock,
      tone: "red",
    },
    {
      label: "Em pauta",
      value: emPauta,
      href: `/app/tce/pauta?semana=${weekStartIso}`,
      icon: Gavel,
      tone: "violet",
    },
    {
      label: "Memoriais pendentes",
      value: memoriaisPendentes,
      href: "/app/tce/processos?memorial=pendente",
      icon: StickyNote,
      tone: "slate",
    },
    {
      label: "Contrarrazões NT",
      value: contrarrazoesNt,
      href: "/app/tce/processos?contrarrazoes=pendentes",
      icon: Scale,
      tone: "emerald",
    },
    {
      label: "Contrarrazões MPCO",
      value: contrarrazoesMpco,
      href: "/app/tce/processos?contrarrazoes=pendentes",
      icon: Scale,
      tone: "emerald",
    },
    {
      label: "Sem despacho",
      value: semDespacho,
      href: "/app/tce/processos?semDespacho=1",
      icon: AlertTriangle,
      tone: "orange",
    },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <PaginaCabecalho
        secao="Tribunal de Contas"
        titulo="Painel TCE"
        descricao="Visão consolidada dos processos do Tribunal de Contas."
        indicadores={kpis.map((k) => ({
          n: k.value,
          t: k.label,
          href: k.href,
          alerta: (k.tone === "rose" || k.tone === "red") && k.value > 0,
        }))}
      />

      <div className="rounded-lg border bg-white px-4 py-3 shadow-sm">
        <BancaFilter />
      </div>

      <Card className="border-brand-navy/20">
        <CardHeader className="border-b bg-brand-navy/5 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-brand-navy" />
              <CardTitle className="text-base">
                Pauta — Semana de {formatDayMonthBR(weekStartIso)} a{" "}
                {formatDayMonthBR(weekEndIso)}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="icon" className="h-8 w-8">
                <Link
                  href={`/app/tce?pautaSemana=${prevWeek}`}
                  aria-label="Semana anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="icon" className="h-8 w-8">
                <Link
                  href={`/app/tce?pautaSemana=${nextWeek}`}
                  aria-label="Semana seguinte"
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/app/tce/pauta?semana=${weekStartIso}`}>
                  Ver pauta completa
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {CAMARA_ORDER.map((camara) => {
              const accent = CAMARA_ACCENT[camara];
              const sessoesCamara = sessoesSemana.filter(
                (s) => s.camara === camara,
              );
              if (sessoesCamara.length === 0) {
                return (
                  <Link
                    key={camara}
                    href={`/app/tce/pauta?semana=${weekStartIso}`}
                    className={cn(
                      "flex flex-col gap-2 rounded-md border border-l-4 border-dashed p-3 text-sm transition-colors hover:shadow-md",
                      accent.border,
                      "bg-slate-50/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          accent.badge,
                        )}
                      >
                        {TCE_CAMARA_LABELS[camara]}
                      </span>
                    </div>
                    <p className="flex flex-1 items-center justify-center py-4 text-center text-xs italic text-muted-foreground">
                      Sem sessão nesta semana
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-navy">
                      <Plus className="h-3 w-3" />
                      Adicionar pauta
                    </span>
                  </Link>
                );
              }
              return (
                <div key={camara} className="flex flex-col gap-2">
                  {sessoesCamara.map((s) => (
                    <Link
                      key={s.id}
                      href={`/app/tce/pauta?semana=${weekStartIso}`}
                      className={cn(
                        "flex flex-col gap-2 rounded-md border border-l-4 p-3 text-sm transition-colors hover:shadow-md",
                        accent.border,
                        accent.bg,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            accent.badge,
                          )}
                        >
                          {TCE_CAMARA_LABELS[s.camara]}
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {formatDiaSemana(s.data.toISOString())}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {s._count.itens} item{s._count.itens === 1 ? "" : "s"} na pauta
                      </p>
                      {s.itens.length > 0 && (
                        <ul className="flex flex-col gap-1 border-t border-white/40 pt-2">
                          {s.itens.map((it) => (
                            <li key={it.id} className="text-xs">
                              <span className="font-mono font-medium text-brand-navy">
                                {it.numeroProcesso}
                              </span>
                              <span className="text-muted-foreground">
                                {" "}
                                — {it.municipio}
                              </span>
                            </li>
                          ))}
                          {s._count.itens > s.itens.length && (
                            <li className="text-[10px] italic text-muted-foreground">
                              +{s._count.itens - s.itens.length} outro
                              {s._count.itens - s.itens.length === 1 ? "" : "s"}
                            </li>
                          )}
                        </ul>
                      )}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isAdvogado && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4 text-brand-navy" />
                Meus Prazos TCE
              </CardTitle>
              <CardDescription>
                Prazos TCE atribuidos a você, ordenados por urgência.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link
                href={`/app/tce/prazos?advogadoRespId=${userId}&status=aberto`}
              >
                Ver todos
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {meusPrazos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Você não tem prazos TCE atribuidos no momento.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {meusPrazos.map((p) => {
                  const dias = diasUteisEntre(new Date(), p.dataVencimento);
                  const urg =
                    dias < 0
                      ? "urgente"
                      : dias <= 3
                        ? "urgente"
                        : dias <= 7
                          ? "proximo"
                          : "normal";
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/app/tce/processos/${p.processo.id}`}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-md border border-l-4 bg-white p-3 text-sm transition-colors hover:bg-slate-50",
                          urg === "urgente"
                            ? "border-l-red-600"
                            : urg === "proximo"
                              ? "border-l-yellow-500"
                              : "border-l-slate-300",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-brand-navy">
                            {p.tipo}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.processo.municipio?.nome ?? "sem município"} —{" "}
                            {p.processo.numero}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold",
                            urg === "urgente"
                              ? "text-red-700"
                              : urg === "proximo"
                                ? "text-yellow-700"
                                : "text-muted-foreground",
                          )}
                        >
                          {countdownUteis(dias)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Próximos prazos TCE</CardTitle>
              <CardDescription>
                5 prazos pendentes mais urgentes em dias úteis.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link href="/app/tce/prazos?status=aberto">
                Ver todos
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {proximosPrazos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem prazos pendentes.
              </p>
            ) : (
              <ul className="space-y-2">
                {proximosPrazos.map((p) => {
                  const dias = diasUteisEntre(new Date(), p.dataVencimento);
                  const urg =
                    dias < 0 || dias <= 3
                      ? "urgente"
                      : dias <= 7
                        ? "proximo"
                        : "normal";
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/app/tce/processos/${p.processo.id}`}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-md border border-l-4 bg-white p-3 text-sm transition-colors hover:bg-slate-50",
                          urg === "urgente"
                            ? "border-l-red-600"
                            : urg === "proximo"
                              ? "border-l-yellow-500"
                              : "border-l-slate-300",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-brand-navy">
                              {p.tipo}
                            </p>
                            {p.advogadoResp && (
                              <span className="inline-flex items-center rounded-full bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-navy">
                                {p.advogadoResp.nome}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.processo.municipio?.nome ?? "sem município"} —{" "}
                            {p.processo.numero}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold",
                            urg === "urgente"
                              ? "text-red-700"
                              : urg === "proximo"
                                ? "text-yellow-700"
                                : "text-muted-foreground",
                          )}
                        >
                          {countdownUteis(dias)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos andamentos TCE</CardTitle>
            <CardDescription>
              5 movimentações mais recentes dos processos TCE.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ultimosAndamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum andamento registrado ainda.
              </p>
            ) : (
              <ol className="relative space-y-5 border-l border-slate-200 pl-5">
                {ultimosAndamentos.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[23px] top-1 flex h-2.5 w-2.5 items-center justify-center">
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-brand-navy bg-white" />
                    </span>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      <span>{formatDate(a.data)}</span>
                      <span aria-hidden="true">•</span>
                      <Link
                        href={`/app/tce/processos/${a.processo.id}`}
                        className="font-mono text-brand-navy hover:underline"
                      >
                        {a.processo.numero}
                      </Link>
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                      <span className="font-medium text-brand-navy">
                        {faseTceLabel(a.processo.tipo, a.fase)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                      {a.descricao}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      por {a.autor.nome} • {a.processo.municipio?.nome ?? "—"}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
