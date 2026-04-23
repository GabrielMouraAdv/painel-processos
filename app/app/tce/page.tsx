import Link from "next/link";
import { getServerSession } from "next-auth";
import { CamaraTce, Role, TipoProcessoTce } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  FileText,
  Gavel,
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
import { computeTceAlertas } from "@/lib/tce-alertas";
import {
  TCE_CAMARA_LABELS,
  TCE_TIPO_LABELS,
  faseTceLabel,
} from "@/lib/tce-config";
import { cn } from "@/lib/utils";

import { CamaraBarChart, TipoPieChart } from "./dashboard-tce-charts";

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

const TIPO_CORES: Record<TipoProcessoTce, string> = {
  PRESTACAO_CONTAS_GOVERNO: "#1e3a8a",
  PRESTACAO_CONTAS_GESTAO: "#6366f1",
  AUDITORIA_ESPECIAL: "#0ea5e9",
  RGF: "#14b8a6",
  AUTO_INFRACAO: "#f59e0b",
  MEDIDA_CAUTELAR: "#ef4444",
};

export default async function TceDashboardPage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;
  const userId = session!.user.id;
  const isAdvogado = session!.user.role === Role.ADVOGADO;

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
    porCamara,
    porTipo,
    proximosPrazos,
    ultimosAndamentos,
    alertasProcessos,
    meusPrazos,
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
    prisma.processoTce.groupBy({
      by: ["camara"],
      where: base,
      _count: { _all: true },
    }),
    prisma.processoTce.groupBy({
      by: ["tipo"],
      where: base,
      _count: { _all: true },
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

  const camaraData = Object.values(CamaraTce).map((c) => ({
    name: TCE_CAMARA_LABELS[c],
    value: porCamara.find((x) => x.camara === c)?._count._all ?? 0,
  }));

  const tipoData = Object.values(TipoProcessoTce).map((t) => ({
    name: TCE_TIPO_LABELS[t],
    value: porTipo.find((x) => x.tipo === t)?._count._all ?? 0,
    color: TIPO_CORES[t],
  }));

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

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processos por camara</CardTitle>
            <CardDescription>
              Distribuicao dos processos TCE entre Primeira, Segunda e Pleno.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CamaraBarChart data={camaraData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuicao por tipo</CardTitle>
            <CardDescription>
              Proporcao dos tipos de processo TCE no portfolio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TipoPieChart data={tipoData} />
          </CardContent>
        </Card>
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
