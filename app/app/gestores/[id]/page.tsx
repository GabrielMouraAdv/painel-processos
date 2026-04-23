import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight } from "lucide-react";
import { getServerSession } from "next-auth";
import { Risco } from "@prisma/client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GrauBadge, TribunalBadge } from "@/components/processo-badges";
import { authOptions } from "@/lib/auth";
import { iniciais } from "@/lib/iniciais";
import { prisma } from "@/lib/prisma";
import { faseLabel } from "@/lib/processo-labels";

import { GestorForm } from "./gestor-form";
import { RiscoChart } from "./risco-chart";

function formatDate(d: Date | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export default async function GestorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const gestor = await prisma.gestor.findFirst({
    where: { id: params.id, escritorioId },
    include: {
      processos: {
        orderBy: { dataDistribuicao: "desc" },
        include: {
          andamentos: {
            orderBy: { data: "desc" },
            include: { autor: { select: { nome: true } } },
          },
        },
      },
    },
  });
  if (!gestor) notFound();

  const totalProcessos = gestor.processos.length;
  const somaValores = gestor.processos.reduce<number>(
    (acc, p) => acc + (p.valor ? Number(p.valor) : 0),
    0,
  );

  const riscoCounts: Record<Risco, number> = { ALTO: 0, MEDIO: 0, BAIXO: 0 };
  for (const p of gestor.processos) riscoCounts[p.risco] += 1;

  const chartData = [
    { name: "Alto", value: riscoCounts.ALTO, color: "#dc2626" },
    { name: "Medio", value: riscoCounts.MEDIO, color: "#f59e0b" },
    { name: "Baixo", value: riscoCounts.BAIXO, color: "#10b981" },
  ].filter((d) => d.value > 0);

  const timeline = gestor.processos
    .flatMap((p) =>
      p.andamentos.map((a) => ({
        id: a.id,
        data: a.data,
        fase: a.fase,
        resultado: a.resultado,
        texto: a.texto,
        autor: a.autor.nome,
        processoId: p.id,
        processoNumero: p.numero,
      })),
    )
    .sort((a, b) => b.data.getTime() - a.data.getTime())
    .slice(0, 30);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/app/gestores">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para gestores
        </Link>
      </Button>

      <header className="flex flex-wrap items-center gap-4">
        <Avatar className="h-16 w-16 bg-brand-navy/10">
          <AvatarFallback className="bg-brand-navy/10 text-lg font-semibold text-brand-navy">
            {iniciais(gestor.nome)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
            {gestor.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {gestor.cargo} • {gestor.municipio}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Processos</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-brand-navy">{totalProcessos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Risco alto</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-red-700">{riscoCounts.ALTO}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Valor em disputa</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-brand-navy">
              {somaValores > 0 ? formatCurrency(somaValores) : "-"}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
            <CardDescription>Informacoes cadastrais do gestor.</CardDescription>
          </CardHeader>
          <CardContent>
            <GestorForm
              gestorId={gestor.id}
              initial={{
                nome: gestor.nome,
                cpf: gestor.cpf,
                municipio: gestor.municipio,
                cargo: gestor.cargo,
                observacoes: gestor.observacoes,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processos por risco</CardTitle>
            <CardDescription>
              Distribuicao dos {totalProcessos} processo{totalProcessos === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RiscoChart data={chartData} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processos vinculados</CardTitle>
          <CardDescription>
            {gestor.processos.length} processo{gestor.processos.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gestor.processos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem processos vinculados.</p>
          ) : (
            <ul className="divide-y">
              {gestor.processos.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/app/processos/${p.id}`}
                    className="flex items-center gap-3 py-3 text-sm hover:bg-slate-50"
                  >
                    <TribunalBadge tribunal={p.tribunal} />
                    <span className="flex-1 font-mono text-xs text-brand-navy">
                      {p.numero}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {faseLabel(p.fase)}
                    </span>
                    <GrauBadge grau={p.grau} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline consolidada</CardTitle>
          <CardDescription>
            Andamentos recentes de todos os processos do gestor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem andamentos registrados.</p>
          ) : (
            <ol className="relative space-y-6 border-l border-slate-200 pl-6">
              {timeline.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[29px] top-1 flex h-3 w-3 items-center justify-center">
                    <span className="h-3 w-3 rounded-full border-2 border-brand-navy bg-white" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{formatDate(a.data)}</span>
                    <span aria-hidden="true">•</span>
                    <Link
                      href={`/app/processos/${a.processoId}`}
                      className="font-mono text-brand-navy hover:underline"
                    >
                      {a.processoNumero}
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
                  <p className="mt-1 text-sm text-slate-700">{a.texto}</p>
                  <p className="mt-1 text-xs text-muted-foreground">por {a.autor}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
