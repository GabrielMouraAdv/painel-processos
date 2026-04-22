import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, ChevronRight, CircleAlert, Clock } from "lucide-react";
import { getServerSession } from "next-auth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GrauBadge,
  RiscoBadge,
  TipoBadge,
  TribunalBadge,
} from "@/components/processo-badges";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { faseLabel } from "@/lib/processo-labels";
import { cn } from "@/lib/utils";

function formatDate(d: Date | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
}

function formatCurrency(v: number | null): string {
  if (v === null || v === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export default async function ProcessoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const processo = await prisma.processo.findFirst({
    where: { id: params.id, escritorioId },
    include: {
      gestor: true,
      advogado: { select: { id: true, nome: true, email: true } },
      andamentos: {
        orderBy: { data: "desc" },
        include: { autor: { select: { nome: true } } },
      },
      prazos: { orderBy: { data: "asc" } },
    },
  });

  if (!processo) notFound();

  const valor = processo.valor ? Number(processo.valor) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:px-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link href="/app/processos">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar para processos
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">
              {processo.numero}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy md:text-3xl">
              {processo.gestor.observacoes ?? processo.gestor.nome}
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestor responsavel: {processo.gestor.nome} ({processo.gestor.cargo})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TipoBadge tipo={processo.tipo} />
            <TribunalBadge tribunal={processo.tribunal} />
            <GrauBadge grau={processo.grau} />
            <RiscoBadge risco={processo.risco} />
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Situacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Fase atual" value={faseLabel(processo.fase)} />
            <Info label="Resultado" value={processo.resultado ?? "-"} />
            <Info label="Juizo" value={processo.juizo} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Distribuicao" value={formatDate(processo.dataDistribuicao)} />
            <Info label="Criado em" value={formatDate(processo.createdAt)} />
            <Info label="Atualizado em" value={formatDate(processo.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Valor envolvido" value={formatCurrency(valor)} />
            <Info
              label="Advogado responsavel"
              value={`${processo.advogado.nome}`}
            />
            <Info label="Contato" value={processo.advogado.email} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Objeto</CardTitle>
          <CardDescription>Descricao do objeto da acao.</CardDescription>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {processo.objeto}
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Andamentos</CardTitle>
            <CardDescription>
              {processo.andamentos.length} registro
              {processo.andamentos.length === 1 ? "" : "s"} — mais recente primeiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processo.andamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem andamentos registrados.
              </p>
            ) : (
              <ol className="relative space-y-6 border-l border-slate-200 pl-6">
                {processo.andamentos.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[29px] top-1 flex h-3 w-3 items-center justify-center">
                      <span className="h-3 w-3 rounded-full border-2 border-brand-navy bg-white" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{formatDate(a.data)}</span>
                      <span aria-hidden="true">•</span>
                      <span className="font-medium text-brand-navy">{a.fase}</span>
                      {a.resultado && (
                        <>
                          <ChevronRight className="h-3 w-3" aria-hidden="true" />
                          <span>{a.resultado}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{a.texto}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      por {a.autor.nome}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prazos</CardTitle>
            <CardDescription>
              {processo.prazos.length} prazo
              {processo.prazos.length === 1 ? "" : "s"} vinculado
              {processo.prazos.length === 1 ? "" : "s"} a este processo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processo.prazos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem prazos cadastrados.
              </p>
            ) : (
              <ul className="space-y-3">
                {processo.prazos.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      "rounded-md border p-3 text-sm",
                      p.cumprido ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium text-brand-navy">
                        {p.cumprido ? (
                          <Check className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-600" />
                        )}
                        {p.tipo}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(p.data)}
                        {p.hora ? ` as ${p.hora}` : ""}
                      </span>
                    </div>
                    {p.observacoes && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {p.observacoes}
                      </p>
                    )}
                    {p.geradoAuto && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CircleAlert className="h-3 w-3" />
                        Gerado automaticamente a partir da fase {p.origemFase ?? "-"}.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-800">{value}</p>
    </div>
  );
}
