import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clock,
  Gavel,
  Scale,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { Grau, Risco, Tribunal } from "@prisma/client";

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
import {
  faseLabel,
  fasesEmPauta,
  grauLabels,
  tribunalLabels,
} from "@/lib/processo-labels";
import { cn } from "@/lib/utils";

import { GrauBar, TribunalPie } from "./dashboard-charts";

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

const TRIBUNAL_COLORS: Record<Tribunal, string> = {
  TJPE: "#1e3a5f",
  TRF5: "#0ea5e9",
  TRF1: "#10b981",
  STJ: "#f59e0b",
  STF: "#dc2626",
  OUTRO: "#94a3b8",
};

export default async function AppHome() {
  const session = await getServerSession(authOptions);
  const nome = session?.user?.name ?? "usuario";
  const escritorioId = session!.user.escritorioId;

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
    porTribunal,
    porGrau,
    prazosProximos,
    ultimosAndamentos,
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
    prisma.processo.groupBy({
      by: ["tribunal"],
      where: base,
      _count: { _all: true },
    }),
    prisma.processo.groupBy({
      by: ["grau"],
      where: base,
      _count: { _all: true },
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
  ]);

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

  const tribunalData = porTribunal.map((row) => ({
    name: tribunalLabels[row.tribunal],
    value: row._count._all,
    color: TRIBUNAL_COLORS[row.tribunal],
  }));

  const grauMap = new Map<Grau, number>();
  for (const r of porGrau) grauMap.set(r.grau, r._count._all);
  const grauData = (Object.values(Grau) as Grau[]).map((g) => ({
    name: grauLabels[g],
    value: grauMap.get(g) ?? 0,
  }));

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

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuicao por tribunal</CardTitle>
            <CardDescription>Share dos processos por corte.</CardDescription>
          </CardHeader>
          <CardContent>
            <TribunalPie data={tribunalData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processos por grau</CardTitle>
            <CardDescription>Contagem absoluta em cada grau.</CardDescription>
          </CardHeader>
          <CardContent>
            <GrauBar data={grauData} />
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
