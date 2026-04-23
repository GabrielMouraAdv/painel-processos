import Link from "next/link";
import { ArrowRight, Briefcase, CalendarClock, Clock, Scale } from "lucide-react";
import { getServerSession } from "next-auth";

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
import { cn } from "@/lib/utils";

function formatDateShort(d: Date): string {
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

export default async function AppHome() {
  const session = await getServerSession(authOptions);
  const nome = session?.user?.name ?? "usuario";
  const escritorioId = session!.user.escritorioId;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em7 = new Date(hoje);
  em7.setDate(em7.getDate() + 7);
  em7.setHours(23, 59, 59, 999);

  const sessentaDiasAtras = new Date();
  sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);

  const [totalProcessos, totalGestores, totalPrazos7d, totalAudiencias, prazosProximos] =
    await Promise.all([
      prisma.processo.count({ where: { escritorioId } }),
      prisma.gestor.count({ where: { escritorioId } }),
      prisma.prazo.count({
        where: {
          cumprido: false,
          data: { gte: hoje, lte: em7 },
          processo: { escritorioId },
        },
      }),
      prisma.prazo.count({
        where: {
          cumprido: false,
          tipo: { contains: "udienc", mode: "insensitive" },
          data: { gte: hoje, lte: em7 },
          processo: { escritorioId },
        },
      }),
      prisma.prazo.findMany({
        where: {
          cumprido: false,
          data: { gte: hoje, lte: em7 },
          processo: { escritorioId },
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
    ]);

  const stats = [
    {
      label: "Processos ativos",
      value: String(totalProcessos),
      icon: Scale,
      hint: "Total no escritorio",
    },
    {
      label: "Gestores cadastrados",
      value: String(totalGestores),
      icon: Briefcase,
      hint: "Pessoas fisicas e juridicas",
    },
    {
      label: "Prazos proximos",
      value: String(totalPrazos7d),
      icon: Clock,
      hint: "Vencem nos proximos 7 dias",
    },
    {
      label: "Audiencias",
      value: String(totalAudiencias),
      icon: CalendarClock,
      hint: "Agendadas para esta semana",
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-8 py-12">
      <header className="flex flex-col gap-3">
        <Badge className="w-fit bg-brand-navy text-white hover:bg-brand-navy/90">
          Painel Juridico
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl">
          Ola, {nome}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Bem-vindo ao painel de Gestao Processual. Acompanhe processos,
          clientes, prazos e audiencias em um unico lugar.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button asChild className="bg-brand-navy hover:bg-brand-navy/90">
            <Link href="/app/processos/novo">Novo processo</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/prazos">Ver prazos</Link>
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-muted">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-brand-navy" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-brand-navy">
                  {stat.value}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Processos recentes</CardTitle>
            <CardDescription>
              Atualizacoes dos ultimos 7 dias nos processos do escritorio.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Lista de processos aparecera aqui.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Prazos urgentes</CardTitle>
              <CardDescription>Vencem nos proximos 7 dias</CardDescription>
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
                Nenhum prazo nos proximos 7 dias.
              </p>
            ) : (
              <ul className="space-y-3">
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
                            {p.processo.gestor.nome} — {formatDateShort(p.data)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold",
                            urg === "urgente"
                              ? "text-red-700"
                              : "text-yellow-700",
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
      </section>
    </div>
  );
}
