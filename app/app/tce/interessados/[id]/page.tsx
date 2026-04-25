import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { iniciais } from "@/lib/iniciais";
import { prisma } from "@/lib/prisma";
import { TCE_CAMARA_LABELS, TCE_TIPO_LABELS, faseTceLabel } from "@/lib/tce-config";

function formatDate(d: Date | null | undefined): string {
  if (!d) return "em curso";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
}

export default async function InteressadoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const gestor = await prisma.gestor.findFirst({
    where: { id: params.id, escritorioId },
    include: {
      historicoGestoes: {
        orderBy: { dataInicio: "desc" },
        include: { municipio: { select: { id: true, nome: true, uf: true } } },
      },
      interessadoProcessosTce: {
        orderBy: { createdAt: "desc" },
        include: {
          processo: {
            select: {
              id: true,
              numero: true,
              tipo: true,
              camara: true,
              faseAtual: true,
              exercicio: true,
              relator: true,
              municipio: { select: { nome: true } },
            },
          },
        },
      },
    },
  });

  if (!gestor) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/app/tce/interessados">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para interessados
        </Link>
      </Button>

      <header className="flex items-start gap-3">
        <Avatar className="h-14 w-14 bg-brand-navy/10">
          <AvatarFallback className="bg-brand-navy/10 text-base font-semibold text-brand-navy">
            {iniciais(gestor.nome)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Interessado
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
            {gestor.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            {gestor.cargo} • {gestor.municipio}
            {gestor.cpf ? ` • CPF ${gestor.cpf}` : ""}
          </p>
        </div>
      </header>

      {gestor.observacoes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observacoes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
            {gestor.observacoes}
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historico de cargos</CardTitle>
            <CardDescription>
              {gestor.historicoGestoes.length} registro
              {gestor.historicoGestoes.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gestor.historicoGestoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem historico de cargos em municipios.
              </p>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                {gestor.historicoGestoes.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[25px] top-1 flex h-3 w-3 items-center justify-center">
                      <span className="h-3 w-3 rounded-full border-2 border-brand-navy bg-white" />
                    </span>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {formatDate(h.dataInicio)} — {formatDate(h.dataFim)}
                    </p>
                    <Link
                      href={`/app/tce/municipios/${h.municipio.id}`}
                      className="text-sm font-semibold text-brand-navy hover:underline"
                    >
                      {h.municipio.nome} / {h.municipio.uf}
                    </Link>
                    <p className="text-xs text-slate-600">{h.cargo}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processos TCE</CardTitle>
            <CardDescription>
              {gestor.interessadoProcessosTce.length} processo
              {gestor.interessadoProcessosTce.length === 1 ? "" : "s"} com este
              interessado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gestor.interessadoProcessosTce.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem processos TCE vinculados.
              </p>
            ) : (
              <ul className="space-y-2">
                {gestor.interessadoProcessosTce.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/app/tce/processos/${i.processo.id}`}
                      className="flex flex-col gap-1 rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium text-brand-navy">
                          {i.processo.numero}
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {TCE_CAMARA_LABELS[i.processo.camara]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700">
                        {TCE_TIPO_LABELS[i.processo.tipo]}
                        {i.processo.municipio
                          ? ` • ${i.processo.municipio.nome}`
                          : ""}
                        {i.processo.exercicio
                          ? ` • exercicio ${i.processo.exercicio}`
                          : ""}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cargo como interessado: {i.cargo} • Fase:{" "}
                        {faseTceLabel(i.processo.tipo, i.processo.faseAtual)}
                      </div>
                    </Link>
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
