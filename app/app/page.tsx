import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  Gavel,
  Scale,
  ShieldAlert,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { CamaraTce, Risco, Role } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { diasAte, urgenciaDe } from "@/lib/prazos";
import { faseLabel, fasesEmPauta } from "@/lib/processo-labels";
import {
  addDaysIso,
  endOfWeekUTC,
  formatDayMonthBR,
  isoDay,
  parseISODate,
  startOfWeekUTC,
} from "@/lib/semana";
import { TCE_CAMARA_LABELS } from "@/lib/tce-config";
import { ORGAOS_JULGADORES } from "@/lib/tjpe-config";
import { cn } from "@/lib/utils";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

function countdownLabel(dias: number): string {
  if (dias < 0) return `atrasado ${-dias}d`;
  if (dias === 0) return "hoje";
  if (dias === 1) return "1 dia";
  return `${dias} dias`;
}

function formatCurrency(v: number | null): string {
  if (v === null || v === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function diasDesde(d: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ref = new Date(d);
  ref.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((hoje.getTime() - ref.getTime()) / 86_400_000));
}

function formatDiaSemanaShort(iso: string): string {
  const d = parseISODate(iso.slice(0, 10));
  if (!d) return iso;
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${weekdays[d.getUTCDay()]} ${day}/${month}`;
}

const CAMARA_DOT: Record<CamaraTce, string> = {
  PRIMEIRA: "bg-[#1e40af]",
  SEGUNDA: "bg-[#047857]",
  PLENO: "bg-[#6b21a8]",
};

type CategoriaTjpe =
  | "direito_publico"
  | "criminal"
  | "regional_caruaru"
  | "pleno";

function categoriaOrgaoTjpe(orgao: string): CategoriaTjpe {
  if (orgao.includes("Regional Caruaru")) return "regional_caruaru";
  if (orgao.includes("Pleno") || orgao === "Plenario Virtual") return "pleno";
  if (orgao.includes("Criminal")) return "criminal";
  return "direito_publico";
}

const CATEGORIA_TJPE_DOT: Record<CategoriaTjpe, string> = {
  direito_publico: "bg-[#1e40af]",
  criminal: "bg-[#b91c1c]",
  regional_caruaru: "bg-[#047857]",
  pleno: "bg-[#6b21a8]",
};

const TIPO_SESSAO_TJPE: Record<string, { label: string; className: string }> = {
  presencial: {
    label: "Presencial",
    className: "bg-slate-200 text-slate-800",
  },
  virtual: {
    label: "Virtual",
    className: "bg-orange-100 text-orange-800",
  },
  plenario_virtual: {
    label: "Plenario Virtual",
    className: "bg-orange-100 text-orange-800",
  },
};

function horaToNumTjpe(h?: string): number {
  if (!h) return 999;
  const m = /^(\d+)h/i.exec(h.trim());
  return m ? parseInt(m[1], 10) : 999;
}

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function AppHome({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const nome = session?.user?.name ?? "usuario";
  const escritorioId = session!.user.escritorioId;
  const userId = session!.user.id;
  const role = session!.user.role;
  const isAdvogado = role === Role.ADVOGADO;

  const pautaSemanaParam = asString(searchParams.pautaSemana);
  const pautaRef = parseISODate(pautaSemanaParam) ?? new Date();
  const pautaWeekStart = startOfWeekUTC(pautaRef);
  const pautaWeekEnd = endOfWeekUTC(pautaWeekStart);
  const pautaWeekStartIso = isoDay(pautaWeekStart);
  const pautaWeekEndIso = isoDay(pautaWeekEnd);
  const pautaPrev = addDaysIso(pautaWeekStartIso, -7);
  const pautaNext = addDaysIso(pautaWeekStartIso, 7);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const em7 = new Date(hoje);
  em7.setDate(em7.getDate() + 7);
  em7.setHours(23, 59, 59, 999);

  const em30 = new Date(hoje);
  em30.setDate(em30.getDate() + 30);
  em30.setHours(23, 59, 59, 999);

  const sessentaDiasAtras = new Date();
  sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);
  sessentaDiasAtras.setHours(0, 0, 0, 0);

  const base = { escritorioId } as const;

  const [
    totalProcessos,
    riscoAlto,
    riscoMedio,
    parados,
    emPauta,
    prazos30d,
    riscoAltoLista,
    paradosLista,
    prazosProximos,
    ultimosAndamentos,
    pautaSessoes,
    pautaSessoesTjpe,
  ] = await Promise.all([
    prisma.processo.count({ where: base }),
    prisma.processo.count({ where: { ...base, risco: Risco.ALTO } }),
    prisma.processo.count({ where: { ...base, risco: Risco.MEDIO } }),
    prisma.processo.count({
      where: {
        ...base,
        andamentos: { none: { data: { gte: sessentaDiasAtras } } },
      },
    }),
    prisma.processo.count({ where: { ...base, fase: { in: fasesEmPauta } } }),
    prisma.prazo.count({
      where: {
        cumprido: false,
        data: { gte: hoje, lte: em30 },
        processo: base,
      },
    }),
    prisma.processo.findMany({
      where: { ...base, risco: Risco.ALTO },
      orderBy: [
        { valor: { sort: "desc", nulls: "last" } },
        { dataDistribuicao: "asc" },
      ],
      take: 5,
      select: {
        id: true,
        numero: true,
        fase: true,
        valor: true,
        gestor: { select: { nome: true } },
      },
    }),
    prisma.processo.findMany({
      where: {
        ...base,
        andamentos: { none: { data: { gte: sessentaDiasAtras } } },
      },
      select: {
        id: true,
        numero: true,
        fase: true,
        dataDistribuicao: true,
        gestor: { select: { nome: true } },
        andamentos: {
          orderBy: { data: "desc" },
          take: 1,
          select: { data: true },
        },
      },
    }),
    prisma.prazo.findMany({
      where: {
        cumprido: false,
        data: { gte: hoje, lte: em30 },
        processo: base,
      },
      orderBy: { data: "asc" },
      take: 5,
      include: {
        processo: {
          select: {
            id: true,
            numero: true,
            gestor: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.andamento.findMany({
      where: { processo: base },
      orderBy: { data: "desc" },
      take: 5,
      include: {
        autor: { select: { nome: true } },
        processo: {
          select: {
            id: true,
            numero: true,
            gestor: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.sessaoPauta.findMany({
      where: {
        escritorioId,
        data: { gte: pautaWeekStart, lte: pautaWeekEnd },
      },
      orderBy: [{ data: "asc" }, { camara: "asc" }],
      include: {
        _count: { select: { itens: true } },
      },
    }),
    prisma.sessaoJudicial.findMany({
      where: {
        escritorioId,
        tribunal: "TJPE",
        data: { gte: pautaWeekStart, lte: pautaWeekEnd },
      },
      orderBy: [{ data: "asc" }],
      include: {
        _count: { select: { itens: true } },
      },
    }),
  ]);

  const pautaSessoesTjpeOrdenadas = [...pautaSessoesTjpe].sort((a, b) => {
    const da = a.data.getTime();
    const db = b.data.getTime();
    if (da !== db) return da - db;
    const ha = horaToNumTjpe(ORGAOS_JULGADORES[a.orgaoJulgador]?.horario);
    const hb = horaToNumTjpe(ORGAOS_JULGADORES[b.orgaoJulgador]?.horario);
    return ha - hb;
  });

  type MeuPrazo = {
    id: string;
    tipo: string;
    data: Date;
    modulo: "judicial" | "tce";
    href: string;
    contexto: string;
  };

  let meusPrazos: MeuPrazo[] = [];
  if (isAdvogado) {
    const [judPrazos, tcePrazos] = await Promise.all([
      prisma.prazo.findMany({
        where: {
          cumprido: false,
          advogadoRespId: userId,
          processo: { escritorioId },
        },
        orderBy: { data: "asc" },
        take: 10,
        include: {
          processo: {
            select: {
              id: true,
              numero: true,
              gestor: { select: { nome: true } },
            },
          },
        },
      }),
      prisma.prazoTce.findMany({
        where: {
          cumprido: false,
          advogadoRespId: userId,
          processo: { escritorioId },
        },
        orderBy: { dataVencimento: "asc" },
        take: 10,
        include: {
          processo: {
            select: {
              id: true,
              numero: true,
              municipio: { select: { nome: true } },
            },
          },
        },
      }),
    ]);

    meusPrazos = [
      ...judPrazos.map<MeuPrazo>((p) => ({
        id: `jud-${p.id}`,
        tipo: p.tipo,
        data: p.data,
        modulo: "judicial" as const,
        href: `/app/processos/${p.processo.id}`,
        contexto: `${p.processo.gestor.nome} — ${p.processo.numero}`,
      })),
      ...tcePrazos.map<MeuPrazo>((p) => ({
        id: `tce-${p.id}`,
        tipo: p.tipo,
        data: p.dataVencimento,
        modulo: "tce" as const,
        href: `/app/tce/processos/${p.processo.id}`,
        contexto: `${p.processo.municipio?.nome ?? "sem municipio"} — ${p.processo.numero}`,
      })),
    ]
      .sort((a, b) => a.data.getTime() - b.data.getTime())
      .slice(0, 8);
  }

  const paradosTop = paradosLista
    .map((p) => {
      const ultima = p.andamentos[0]?.data ?? p.dataDistribuicao;
      return {
        id: p.id,
        numero: p.numero,
        fase: p.fase,
        gestor: p.gestor.nome,
        ultimaData: ultima,
        diasSem: diasDesde(ultima),
      };
    })
    .sort((a, b) => b.diasSem - a.diasSem)
    .slice(0, 5);

  const riscoAltoTop = riscoAltoLista.map((p) => ({
    id: p.id,
    numero: p.numero,
    fase: p.fase,
    gestor: p.gestor.nome,
    valor: p.valor ? Number(p.valor) : null,
  }));

  const kpis = [
    {
      label: "Processos ativos",
      value: totalProcessos,
      icon: Scale,
      href: "/app/processos",
      tone: "default" as const,
    },
    {
      label: "Risco alto",
      value: riscoAlto,
      icon: ShieldAlert,
      href: "/app/processos?risco=ALTO",
      tone: "red" as const,
    },
    {
      label: "Risco medio",
      value: riscoMedio,
      icon: TriangleAlert,
      href: "/app/processos?risco=MEDIO",
      tone: "amber" as const,
    },
    {
      label: "Parados (60d+)",
      value: parados,
      icon: Clock,
      href: "/app/processos?status=parados",
      tone: "slate" as const,
    },
    {
      label: "Em pauta",
      value: emPauta,
      icon: Gavel,
      href: "/app/processos?status=em-pauta",
      tone: "navy" as const,
    },
    {
      label: "Prazos 30d",
      value: prazos30d,
      icon: CalendarClock,
      href: "/app/prazos?status=pendente",
      tone: "navy" as const,
    },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 md:px-8">
      <header className="flex flex-col gap-3">
        <Badge className="w-fit bg-brand-navy text-white hover:bg-brand-navy/90">
          Painel Juridico
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-navy sm:text-4xl">
          Ola, {nome}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Visao geral do escritorio — clique nos indicadores para filtrar rapidamente.
        </p>
      </header>

      {parados > 0 && (
        <div className="flex gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">
              {parados} processo{parados === 1 ? "" : "s"} ha mais de 60 dias sem andamento.
            </p>
            <p className="text-amber-800">
              Verifique se ha alguma pendencia que esteja travando o fluxo.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
          >
            <Link href="/app/processos?status=parados">
              Ver processos
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4 text-brand-navy" />
            Pautas da Semana
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="icon" className="h-7 w-7">
              <Link
                href={`/app?pautaSemana=${pautaPrev}`}
                aria-label="Semana anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <span className="px-1 text-xs font-medium text-brand-navy">
              {formatDayMonthBR(pautaWeekStartIso)} a{" "}
              {formatDayMonthBR(pautaWeekEndIso)}
            </span>
            <Button asChild variant="outline" size="icon" className="h-7 w-7">
              <Link
                href={`/app?pautaSemana=${pautaNext}`}
                aria-label="Semana seguinte"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold text-brand-navy">TJPE</h3>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {pautaSessoesTjpeOrdenadas.length} sessa
                  {pautaSessoesTjpeOrdenadas.length === 1 ? "o" : "oes"}
                </span>
              </div>
              {pautaSessoesTjpeOrdenadas.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  Nenhuma sessao TJPE nesta semana.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {pautaSessoesTjpeOrdenadas.map((s) => {
                    const categoria = categoriaOrgaoTjpe(s.orgaoJulgador);
                    const tipo = TIPO_SESSAO_TJPE[s.tipoSessao];
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/app/pautas?semana=${pautaWeekStartIso}`}
                          className="flex items-start justify-between gap-3 rounded-md border bg-white px-3 py-2 text-sm transition-colors hover:bg-slate-50"
                        >
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                                  CATEGORIA_TJPE_DOT[categoria],
                                )}
                                aria-hidden="true"
                              />
                              <span className="text-xs font-medium text-muted-foreground">
                                {formatDiaSemanaShort(s.data.toISOString())}
                              </span>
                              <span className="truncate text-sm font-medium text-brand-navy">
                                {s.orgaoJulgador}
                              </span>
                            </div>
                            {tipo && (
                              <span
                                className={cn(
                                  "inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                                  tipo.className,
                                )}
                              >
                                {tipo.label}
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {s._count.itens} item{s._count.itens === 1 ? "" : "s"}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-auto pt-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                  <Link href={`/app/pautas?semana=${pautaWeekStartIso}`}>
                    Ver pautas
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold text-brand-navy">TCE</h3>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {pautaSessoes.length} sessa
                  {pautaSessoes.length === 1 ? "o" : "oes"}
                </span>
              </div>
              {pautaSessoes.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">
                  Nenhuma sessao TCE nesta semana.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {pautaSessoes.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/app/tce/pauta?semana=${pautaWeekStartIso}`}
                        className="flex items-center justify-between gap-3 rounded-md border bg-white px-3 py-2 text-sm transition-colors hover:bg-slate-50"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                              CAMARA_DOT[s.camara],
                            )}
                            aria-hidden="true"
                          />
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatDiaSemanaShort(s.data.toISOString())}
                          </span>
                          <span className="truncate text-sm font-medium text-brand-navy">
                            {TCE_CAMARA_LABELS[s.camara]}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {s._count.itens} item{s._count.itens === 1 ? "" : "s"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-2">
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                  <Link href={`/app/tce/pauta?semana=${pautaWeekStartIso}`}>
                    Ver pautas
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>

      {isAdvogado && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4 text-brand-navy" />
                Meus Prazos
              </CardTitle>
              <CardDescription>
                Prazos judiciais e TCE atribuidos a voce, ordenados por urgencia.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link href={`/app/prazos?advogadoRespId=${userId}&status=pendente`}>
                Ver prazos judiciais
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {meusPrazos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Voce nao tem prazos atribuidos no momento.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {meusPrazos.map((p) => {
                  const dias = diasAte(p.data);
                  const urg = urgenciaDe(p.data, false);
                  return (
                    <li key={p.id}>
                      <Link
                        href={p.href}
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
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-brand-navy">
                              {p.tipo}
                            </p>
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                p.modulo === "tce"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-slate-100 text-slate-600",
                              )}
                            >
                              {p.modulo === "tce" ? "TCE" : "Judicial"}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.contexto} — {formatDate(p.data)}
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
                          {countdownLabel(dias)}
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
              <CardTitle className="text-base">Risco alto</CardTitle>
              <CardDescription>
                5 processos de maior valor classificados como risco alto.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link href="/app/processos?risco=ALTO">
                Ver todos
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {riscoAltoTop.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum processo de risco alto.
              </p>
            ) : (
              <ul className="space-y-2">
                {riscoAltoTop.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/app/processos/${p.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-l-4 border-l-red-600 bg-white p-3 text-sm transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[13px] text-brand-navy">
                          {p.numero}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.gestor} — {faseLabel(p.fase)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-red-700">
                        {formatCurrency(p.valor)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Parados ha mais de 60 dias</CardTitle>
              <CardDescription>
                Processos sem andamento ha mais tempo.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link href="/app/processos?status=parados">
                Ver todos
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {paradosTop.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum processo parado ha mais de 60 dias.
              </p>
            ) : (
              <ul className="space-y-2">
                {paradosTop.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/app/processos/${p.id}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-l-4 border-l-amber-500 bg-white p-3 text-sm transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-[13px] text-brand-navy">
                          {p.numero}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.gestor} — {faseLabel(p.fase)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-amber-700">
                        {p.diasSem}d sem andamento
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Proximos prazos</CardTitle>
              <CardDescription>5 prazos pendentes mais urgentes.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="-mr-2">
              <Link href="/app/prazos">
                Ver todos
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {prazosProximos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum prazo nos proximos 30 dias.
              </p>
            ) : (
              <ul className="space-y-2">
                {prazosProximos.map((p) => {
                  const dias = diasAte(p.data);
                  const urg = urgenciaDe(p.data, p.cumprido);
                  return (
                    <li key={p.id}>
                      <Link
                        href={`/app/processos/${p.processo.id}`}
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
                            {p.processo.gestor.nome} — {formatDate(p.data)}
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
                          {countdownLabel(dias)}
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
            <CardTitle className="text-base">Ultimos andamentos</CardTitle>
            <CardDescription>
              5 movimentacoes mais recentes do escritorio.
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
                        href={`/app/processos/${a.processo.id}`}
                        className="font-mono text-brand-navy hover:underline"
                      >
                        {a.processo.numero}
                      </Link>
                      <span aria-hidden="true">•</span>
                      <span className="font-medium text-brand-navy">
                        {faseLabel(a.fase)}
                      </span>
                      {a.resultado && (
                        <>
                          <ChevronRight className="h-3 w-3" aria-hidden="true" />
                          <span>{a.resultado}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                      {a.texto}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      por {a.autor.nome} • gestor {a.processo.gestor.nome}
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

function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tone: "default" | "red" | "amber" | "slate" | "navy";
}) {
  const valueClass = {
    default: "text-brand-navy",
    red: "text-red-700",
    amber: "text-amber-700",
    slate: "text-slate-700",
    navy: "text-brand-navy",
  }[tone];
  const iconClass = {
    default: "text-brand-navy",
    red: "text-red-600",
    amber: "text-amber-600",
    slate: "text-slate-500",
    navy: "text-brand-navy",
  }[tone];

  return (
    <Link
      href={href}
      className="group rounded-lg border bg-white p-4 shadow-sm transition hover:border-brand-navy/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon className={cn("h-4 w-4", iconClass)} />
      </div>
      <p className={cn("mt-2 text-3xl font-semibold leading-tight", valueClass)}>
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground group-hover:text-brand-navy">
        ver lista →
      </p>
    </Link>
  );
}
