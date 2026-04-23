import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  FileText,
  Gavel,
  X,
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
import { prisma } from "@/lib/prisma";
import {
  TCE_CAMARAS,
  TCE_CAMARA_LABELS,
  TCE_TIPO_LABELS,
  faseTceLabel,
} from "@/lib/tce-config";
import { cn } from "@/lib/utils";

import { AndamentoTceForm } from "./andamento-tce-form";
import {
  InteressadosTceManager,
  type InteressadoItem,
} from "./interessados-tce-manager";
import { PrazosTceCardActions, type PrazoTceItem } from "./prazo-tce-actions";

function formatDate(d: Date | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
}

function formatCurrency(v: number | null): string {
  if (v === null || v === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(v);
}

function StatusIcon({ active }: { active: boolean }) {
  return active ? (
    <Check className="h-4 w-4 text-emerald-600" />
  ) : (
    <X className="h-4 w-4 text-red-500" />
  );
}

export default async function ProcessoTceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const processo = await prisma.processoTce.findFirst({
    where: { id: params.id, escritorioId },
    include: {
      municipio: { select: { id: true, nome: true, uf: true } },
      interessados: {
        include: { gestor: { select: { id: true, nome: true } } },
        orderBy: { createdAt: "asc" },
      },
      andamentos: {
        orderBy: { data: "desc" },
        include: { autor: { select: { nome: true } } },
      },
      prazos: { orderBy: { dataVencimento: "asc" } },
    },
  });

  if (!processo) notFound();

  const gestores = await prisma.gestor.findMany({
    where: { escritorioId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  const camara = TCE_CAMARAS[processo.camara];

  const interessados: InteressadoItem[] = processo.interessados.map((i) => ({
    id: i.id,
    cargo: i.cargo,
    gestor: i.gestor,
  }));

  const prazos: PrazoTceItem[] = processo.prazos.map((p) => ({
    id: p.id,
    tipo: p.tipo,
    dataIntimacao: p.dataIntimacao.toISOString(),
    dataVencimento: p.dataVencimento.toISOString(),
    diasUteis: p.diasUteis,
    prorrogavel: p.prorrogavel,
    cumprido: p.cumprido,
    observacoes: p.observacoes,
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/app/tce/processos">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para processos TCE
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{processo.numero}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy md:text-3xl">
            {TCE_TIPO_LABELS[processo.tipo]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {processo.municipio ? (
              <>
                Municipio:{" "}
                <Link
                  href={`/app/tce/municipios/${processo.municipio.id}`}
                  className="text-brand-navy hover:underline"
                >
                  {processo.municipio.nome} / {processo.municipio.uf}
                </Link>
              </>
            ) : (
              "Sem municipio vinculado"
            )}
            {processo.exercicio && ` • Exercicio ${processo.exercicio}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <BoolBadge label="Nota Tecnica" value={processo.notaTecnica} />
          <BoolBadge label="Parecer MPCO" value={processo.parecerMpco} />
          <BoolBadge label="Despachado" value={processo.despachadoComRelator} />
          <BoolBadge label="Memorial" value={processo.memorialPronto} />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados do processo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="Tipo" value={TCE_TIPO_LABELS[processo.tipo]} />
            <Info label="Fase atual" value={faseTceLabel(processo.tipo, processo.faseAtual)} />
            <Info label="Camara" value={TCE_CAMARA_LABELS[processo.camara]} />
            <Info label="Relator" value={processo.relator ?? "-"} />
            <Info
              label="Conselheiro substituto"
              value={processo.conselheiroSubstituto ?? "-"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datas e valor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="Autuacao" value={formatDate(processo.dataAutuacao)} />
            <Info label="Intimacao" value={formatDate(processo.dataIntimacao)} />
            <Info label="Atualizado em" value={formatDate(processo.updatedAt)} />
            <Info label="Valor autuado" value={formatCurrency(processo.valorAutuado ? Number(processo.valorAutuado) : null)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gavel className="h-4 w-4" />
              {camara.label}
            </CardTitle>
            <CardDescription>Composicao atual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {camara.presidente && (
              <p>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Presidente:
                </span>{" "}
                <span className="font-medium text-brand-navy">
                  {camara.presidente}
                </span>
              </p>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Conselheiros
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                {camara.titulares.map((c) => (
                  <li key={c} className={cn(c === processo.relator && "font-semibold text-brand-navy")}>
                    {c}
                    {c === processo.relator && " (relator)"}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Objeto</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {processo.objeto}
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interessados</CardTitle>
            <CardDescription>
              Gestores vinculados a este processo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InteressadosTceManager
              processoId={processo.id}
              interessados={interessados}
              gestores={gestores}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prazos</CardTitle>
            <CardDescription>
              Contagem em dias uteis e status de cumprimento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PrazosTceCardActions processoId={processo.id} prazos={prazos} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar andamento</CardTitle>
          <CardDescription>
            Registre uma movimentacao e, se quiser, atualize a fase do processo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AndamentoTceForm
            processoId={processo.id}
            tipo={processo.tipo}
            faseAtual={processo.faseAtual}
          />
        </CardContent>
      </Card>

      <Card>
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
            <ol className="relative space-y-5 border-l border-slate-200 pl-6">
              {processo.andamentos.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[29px] top-1 flex h-3 w-3 items-center justify-center">
                    <span className="h-3 w-3 rounded-full border-2 border-brand-navy bg-white" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{formatDate(a.data)}</span>
                    <span aria-hidden="true">•</span>
                    <span className="font-medium text-brand-navy">
                      {faseTceLabel(processo.tipo, a.fase)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{a.descricao}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    por {a.autor.nome}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
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

function BoolBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1",
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      <StatusIcon active={value} />
      {label}
    </span>
  );
}
