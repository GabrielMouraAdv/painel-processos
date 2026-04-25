import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { diasUteisRestantes } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import {
  TCE_RECURSO_LABELS,
} from "@/lib/tce-config";
import { cn } from "@/lib/utils";

import { SubprocessoActions } from "./subprocesso-actions";

function formatDate(d: Date | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export default async function SubprocessoDetailPage({
  params,
}: {
  params: { id: string; subprocessoId: string };
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const sub = await prisma.subprocessoTce.findFirst({
    where: {
      id: params.subprocessoId,
      processoPaiId: params.id,
      processoPai: { escritorioId },
    },
    include: {
      processoPai: {
        select: { id: true, numero: true, tipo: true, camara: true },
      },
      subprocessoPai: {
        select: { id: true, numero: true, tipoRecurso: true },
      },
      andamentos: { orderBy: { data: "desc" } },
      prazos: { orderBy: { dataVencimento: "asc" } },
      documentos: { orderBy: { createdAt: "desc" } },
      subprocessosFilhos: {
        orderBy: [{ dataInterposicao: "asc" }],
        select: {
          id: true,
          numero: true,
          tipoRecurso: true,
          fase: true,
          dataInterposicao: true,
        },
      },
    },
  });

  if (!sub) notFound();

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href={`/app/tce/processos/${sub.processoPai.id}`}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para processo {sub.processoPai.numero}
        </Link>
      </Button>

      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {TCE_RECURSO_LABELS[sub.tipoRecurso]}
          {sub.subprocessoPai
            ? ` interposto em ${sub.subprocessoPai.numero}`
            : ""}
        </p>
        <h1 className="font-mono text-3xl font-semibold tracking-tight text-brand-navy">
          {sub.numero}
        </h1>
        <p className="text-sm text-muted-foreground">
          Interposto em {formatDate(sub.dataInterposicao)}
          {sub.dataIntimacao
            ? ` • Intimado em ${formatDate(sub.dataIntimacao)}`
            : ""}
          {sub.relator ? ` • Rel. ${sub.relator}` : ""}
        </p>
      </header>

      <SubprocessoActions
        subprocessoId={sub.id}
        fase={sub.fase}
        relator={sub.relator}
        decisao={sub.decisao}
        observacoes={sub.observacoes}
      />

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prazos</CardTitle>
            <CardDescription>
              {sub.prazos.length} prazo{sub.prazos.length === 1 ? "" : "s"}{" "}
              registrado{sub.prazos.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sub.prazos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem prazos registrados.
              </p>
            ) : (
              <ul className="space-y-2">
                {sub.prazos.map((p) => {
                  const dias = diasUteisRestantes(p.dataVencimento, hoje);
                  const urgente = !p.cumprido && dias <= 7;
                  return (
                    <li
                      key={p.id}
                      className={cn(
                        "rounded-md border bg-white p-3 text-sm",
                        p.cumprido && "opacity-60",
                        urgente &&
                          "border-l-4 border-l-red-500 border-red-200 bg-red-50",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-brand-navy">
                          {p.tipo}
                        </span>
                        <div className="flex items-center gap-2">
                          {!p.prorrogavel && (
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-orange-800">
                              improrrogavel
                            </span>
                          )}
                          {p.cumprido && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                              cumprido
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Intimacao {formatDate(p.dataIntimacao)} • Vencimento{" "}
                        {formatDate(p.dataVencimento)} ({p.diasUteis} dias
                        uteis)
                      </p>
                      {!p.cumprido && (
                        <p className="mt-0.5 text-xs">
                          {dias < 0
                            ? `atrasado ${-dias} dias uteis`
                            : dias === 0
                              ? "vence hoje"
                              : `${dias} dia${dias === 1 ? "" : "s"} ute${dias === 1 ? "l" : "is"} restante${dias === 1 ? "" : "s"}`}
                        </p>
                      )}
                      {p.observacoes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          {p.observacoes}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Andamentos</CardTitle>
            <CardDescription>
              {sub.andamentos.length} registro
              {sub.andamentos.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sub.andamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem andamentos registrados.
              </p>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                {sub.andamentos.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[23px] top-1 flex h-2.5 w-2.5">
                      <span className="h-2.5 w-2.5 rounded-full border-2 border-brand-navy bg-white" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      <span>{formatDateTime(a.data)}</span>
                      <span aria-hidden="true">•</span>
                      <span className="font-medium text-brand-navy">
                        {a.fase}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {a.descricao}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>

      {sub.subprocessosFilhos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recursos vinculados</CardTitle>
            <CardDescription>
              {sub.subprocessosFilhos.length} subprocesso
              {sub.subprocessosFilhos.length === 1 ? "" : "s"} interposto
              {sub.subprocessosFilhos.length === 1 ? "" : "s"} a partir deste.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {sub.subprocessosFilhos.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/app/tce/processos/${sub.processoPai.id}/recursos/${f.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-mono font-bold text-brand-navy">
                        {f.numero}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {TCE_RECURSO_LABELS[f.tipoRecurso]} • Interposto em{" "}
                        {formatDate(f.dataInterposicao)} • Fase: {f.fase}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
