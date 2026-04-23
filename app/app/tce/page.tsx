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

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { diasUteisEntre } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import {
  addDaysIso,
  endOfWeekUTC,
  formatDayMonthBR,
  isoDay,
  parseISODate,
  startOfWeekUTC,
} from "@/lib/semana";
import { computeTceAlertas } from "@/lib/tce-alertas";
import { TCE_CAMARA_LABELS, faseTceLabel } from "@/lib/tce-config";
import { cn } from "@/lib/utils";

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
  const ref = parseISODate(semanaParam) ?? new Date();
  const weekStart = startOfWeekUTC(ref);
  const weekEnd = endOfWeekUTC(weekStart);
  const weekStartIso = isoDay(weekStart);
  const weekEndIso = isoDay(weekEnd);
  const prevWeek = addDaysIso(weekStartIso, -7);
  const nextWeek = addDaysIso(weekStartIso, 7);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const base = { escritorioId } as const;

  const [
    total,
    comPrazoAberto,
    emPauta,
    memoriaisPendentes,
    contrarrazoesNt,
    contrarrazoesMpco,
    semDespacho,
    proximosPrazos,
    ultimosAndamentos,
    alertasProcessos,
    meusPrazos,
    sessoesSemana,
  ] = await Promise.all([
    prisma.processoTce.count({ where: base }),
    prisma.processoTce.count({
      where: { ...base, prazos: { some: { cumprido: false } } },
    }),
    prisma.processoTce.count({
      where: {
        ...base,
        faseAtual: { in: ["acordao_1", "referendo_pleno", "acordao_agravo"] },
      },
    }),
    prisma.processoTce.count({
      where: { ...base, memorialPronto: false },
    }),
    prisma.processoTce.count({
      where: { ...base, notaTecnica: true },
    }),
    prisma.processoTce.count({
      where: { ...base, parecerMpco: true },
    }),
    prisma.processoTce.count({
      where: { ...base, despachadoComRelator: false },
    }),
    prisma.prazoTce.findMany({
      where: {
        cumprido: false,
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
    prisma.processoTce.findMany({
      where: {
        ...base,
        OR: [
          { notaTecnica: true },
          { parecerMpco: true },
          { AND: [{ memorialPronto: true }, { despachadoComRelator: false }] },
        ],
      },
      select: {
        id: true,
        numero: true,
        notaTecnica: true,
        parecerMpco: true,
        memorialPronto: true,
        despachadoComRelator: true,
        municipio: { select: { nome: true } },
      },
      take: 20,
    }),
    isAdvogado
      ? prisma.prazoTce.findMany({
          where: {
            cumprido: false,
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

  const totalAlertas = alertasProcessos.reduce(
    (acc, p) =>
      acc +
      computeTceAlertas({
        notaTecnica: p.notaTecnica,
        parecerMpco: p.parecerMpco,
        despachadoComRelator: p.despachadoComRelator,
        memorialPronto: p.memorialPronto,
      }).length,
    0,
  );

  const kpis: {
    label: string;
    value: number;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: "navy" | "red" | "orange" | "slate" | "violet" | "emerald";
  }[] = [
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
      href: "/app/tce/processos?pauta=1",
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
      label: "Contrarrazoes NT",
      value: contrarrazoesNt,
      href: "/app/tce/processos?contrarrazoes=pendentes",
      icon: Scale,
      tone: "emerald",
    },
    {
      label: "Contrarrazoes MPCO",
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

  const toneStyles: Record<(typeof kpis)[number]["tone"], string> = {
    navy: "border-brand-navy/20 bg-brand-navy/5 text-brand-navy",
    red: "border-red-200 bg-red-50 text-red-800",
    orange: "border-orange-200 bg-orange-50 text-orange-800",
    slate: "border-slate-300 bg-slate-100 text-slate-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Tribunal de Contas
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
          Dashboard TCE
        </h1>
        <p className="text-sm text-muted-foreground">
          Visao consolidada dos processos do Tribunal de Contas.
        </p>
      </header>

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
          {sessoesSemana.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CalendarRange
                className="h-8 w-8 text-slate-400"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                Nenhuma sessao cadastrada para esta semana.
              </p>
              <Button asChild size="sm" className="bg-brand-navy hover:bg-brand-navy/90">
                <Link href={`/app/tce/pauta?semana=${weekStartIso}`}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar Pauta
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {sessoesSemana.map((s) => {
                const accent = CAMARA_ACCENT[s.camara];
                return (
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalAlertas > 0 && (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">
              {totalAlertas} alerta{totalAlertas === 1 ? "" : "s"} automatico
              {totalAlertas === 1 ? "" : "s"} ativo
              {totalAlertas === 1 ? "" : "s"} em processos TCE.
            </p>
            <p className="text-amber-800">
              Contrarrazoes pendentes e despachos ainda nao agendados.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
          >
            <Link href="/app/tce/processos?contrarrazoes=pendentes">
              Ver processos
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              href={k.href}
              className={cn(
                "group rounded-lg border p-4 shadow-sm transition hover:shadow-md",
                toneStyles[k.tone],
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
                  {k.label}
                </p>
                <Icon className="h-4 w-4 opacity-80" aria-hidden="true" />
              </div>
              <p className="mt-2 text-3xl font-semibold leading-tight">
                {k.value}
              </p>
            </Link>
          );
        })}
      </section>

      {isAdvogado && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4 text-brand-navy" />
                Meus Prazos TCE
              </CardTitle>
              <CardDescription>
                Prazos TCE atribuidos a voce, ordenados por urgencia.
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
                Voce nao tem prazos TCE atribuidos no momento.
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
                            {p.processo.municipio?.nome ?? "sem municipio"} —{" "}
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
              <CardTitle className="text-base">Proximos prazos TCE</CardTitle>
              <CardDescription>
                5 prazos pendentes mais urgentes em dias uteis.
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
                            {p.processo.municipio?.nome ?? "sem municipio"} —{" "}
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
            <CardTitle className="text-base">Ultimos andamentos TCE</CardTitle>
            <CardDescription>
              5 movimentacoes mais recentes dos processos TCE.
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
