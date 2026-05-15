import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  DollarSign,
  MapPin,
  UserCheck,
} from "lucide-react";

import { BancaBadgeList } from "@/components/bancas/banca-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import {
  computeStatusNota,
  formatBRL,
  podeAcessarFinanceiro,
  STATUS_NOTA,
} from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { TCE_CAMARA_LABELS, TCE_TIPO_LABELS, faseTceLabel } from "@/lib/tce-config";

function formatDate(d: Date | null | undefined): string {
  if (!d) return "em curso";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
}

export default async function MunicipioDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const municipio = await prisma.municipio.findFirst({
    where: { id: params.id, escritorioId },
    include: {
      gestoes: {
        orderBy: { dataInicio: "desc" },
        include: { gestor: { select: { id: true, nome: true, cargo: true } } },
      },
      processosTce: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          numero: true,
          tipo: true,
          camara: true,
          faseAtual: true,
          exercicio: true,
          relator: true,
        },
      },
    },
  });

  if (!municipio) notFound();

  const gestorIds = municipio.gestoes.map((g) => g.gestorId);
  const processosViaGestores = gestorIds.length
    ? await prisma.processoTce.findMany({
        where: {
          escritorioId,
          municipioId: { not: municipio.id },
          interessados: { some: { gestorId: { in: gestorIds } } },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          numero: true,
          tipo: true,
          camara: true,
          faseAtual: true,
          exercicio: true,
          relator: true,
          interessados: {
            where: { gestorId: { in: gestorIds } },
            select: { gestor: { select: { nome: true } } },
            take: 1,
          },
        },
      })
    : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/app/tce/municipios">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para municipios
        </Link>
      </Button>

      <header className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-navy/10 text-brand-navy">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Municipio
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
            {municipio.nome}
          </h1>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {municipio.uf}
            {municipio.cnpjPrefeitura && ` • CNPJ ${municipio.cnpjPrefeitura}`}
          </p>
        </div>
      </header>

      {municipio.observacoes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Observacoes</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
            {municipio.observacoes}
          </CardContent>
        </Card>
      )}

      {podeAcessarFinanceiro(
        session!.user.role,
        session!.user.email ?? null,
      ) && (
        <StatusFinanceiroCard municipioId={municipio.id} />
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historico de gestao</CardTitle>
            <CardDescription>
              {municipio.gestoes.length} registro
              {municipio.gestoes.length === 1 ? "" : "s"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {municipio.gestoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem historico de gestao registrado.
              </p>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                {municipio.gestoes.map((g) => (
                  <li key={g.id} className="relative">
                    <span className="absolute -left-[25px] top-1 flex h-3 w-3 items-center justify-center">
                      <span className="h-3 w-3 rounded-full border-2 border-brand-navy bg-white" />
                    </span>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {formatDate(g.dataInicio)} — {formatDate(g.dataFim)}
                    </p>
                    <Link
                      href={`/app/tce/interessados/${g.gestorId}`}
                      className="text-sm font-semibold text-brand-navy hover:underline"
                    >
                      {g.gestor.nome}
                    </Link>
                    <p className="text-xs text-slate-600">
                      {g.cargo}
                      {g.gestor.cargo !== g.cargo ? ` (atualmente ${g.gestor.cargo})` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Processos TCE vinculados</CardTitle>
            <CardDescription>
              {municipio.processosTce.length} processo
              {municipio.processosTce.length === 1 ? "" : "s"} no municipio.
              {processosViaGestores.length > 0 &&
                ` +${processosViaGestores.length} via gestores historicos.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProcessoList
              processos={municipio.processosTce.map((p) => ({
                ...p,
                viaGestor: null,
              }))}
              vazioLabel="Nenhum processo TCE vinculado diretamente."
            />
            {processosViaGestores.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Via gestores que ja passaram pelo municipio
                </p>
                <ProcessoList
                  processos={processosViaGestores.map((p) => ({
                    id: p.id,
                    numero: p.numero,
                    tipo: p.tipo,
                    camara: p.camara,
                    faseAtual: p.faseAtual,
                    exercicio: p.exercicio,
                    relator: p.relator,
                    viaGestor: p.interessados[0]?.gestor.nome ?? null,
                  }))}
                  vazioLabel=""
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

type ProcessoItem = {
  id: string;
  numero: string;
  tipo: keyof typeof TCE_TIPO_LABELS;
  camara: keyof typeof TCE_CAMARA_LABELS;
  faseAtual: string;
  exercicio: string | null;
  relator: string | null;
  viaGestor: string | null;
};

function ProcessoList({
  processos,
  vazioLabel,
}: {
  processos: ProcessoItem[];
  vazioLabel: string;
}) {
  if (processos.length === 0 && vazioLabel) {
    return <p className="text-sm text-muted-foreground">{vazioLabel}</p>;
  }
  if (processos.length === 0) return null;
  return (
    <ul className="space-y-2">
      {processos.map((p) => (
        <li key={p.id}>
          <Link
            href={`/app/tce/processos/${p.id}`}
            className="flex flex-col gap-1 rounded-md border border-slate-200 p-3 text-sm hover:bg-slate-50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-medium text-brand-navy">
                {p.numero}
              </span>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {TCE_CAMARA_LABELS[p.camara]}
              </span>
            </div>
            <div className="text-xs text-slate-700">
              {TCE_TIPO_LABELS[p.tipo]}
              {p.exercicio ? ` • exercicio ${p.exercicio}` : ""}
              {p.relator ? ` • Relator ${p.relator}` : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              Fase: {faseTceLabel(p.tipo, p.faseAtual)}
              {p.viaGestor && (
                <span className="ml-2 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                  <UserCheck className="h-3 w-3" />
                  via {p.viaGestor}
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function StatusFinanceiroCard({
  municipioId,
}: {
  municipioId: string;
}) {
  const anoAtual = new Date().getFullYear();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const contratoAtivo = await prisma.contratoMunicipal.findFirst({
    where: { municipioId, ativo: true },
    select: {
      id: true,
      bancasSlug: true,
      valorMensal: true,
      dataInicio: true,
      dataFim: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const notas = await prisma.notaFiscal.findMany({
    where: {
      contrato: { municipioId },
      anoReferencia: anoAtual,
    },
    select: {
      valorNota: true,
      valorPago: true,
      pago: true,
      dataVencimento: true,
    },
  });

  let recebido = 0;
  let aberto = 0;
  let atraso = 0;
  for (const n of notas) {
    const v = Number(n.valorNota);
    const status = computeStatusNota(
      { pago: n.pago, dataVencimento: n.dataVencimento },
      hoje,
    );
    if (status === STATUS_NOTA.PAGA) {
      recebido += n.valorPago ? Number(n.valorPago) : v;
    } else if (status === STATUS_NOTA.A_VENCER) {
      aberto += v;
    } else {
      atraso += v;
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-700" />
          <CardTitle className="text-base">
            Status Financeiro ({anoAtual})
          </CardTitle>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/app/financeiro/municipios?municipioId=${municipioId}`}
          >
            Ver no Financeiro
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {contratoAtivo ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
              Contrato ativo
            </span>
            <span className="text-slate-700">
              {formatBRL(Number(contratoAtivo.valorMensal))}/mes
            </span>
            <BancaBadgeList slugs={contratoAtivo.bancasSlug} size="sm" />
            <span className="text-[11px] text-muted-foreground">
              Inicio:{" "}
              {contratoAtivo.dataInicio.toLocaleDateString("pt-BR")}
              {contratoAtivo.dataFim &&
                ` • Fim: ${contratoAtivo.dataFim.toLocaleDateString("pt-BR")}`}
            </span>
          </div>
        ) : (
          <div className="text-sm italic text-muted-foreground">
            Sem contrato ativo. Use o botao acima para criar.
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              Recebido
            </p>
            <p className="font-mono text-sm font-bold text-emerald-900">
              {formatBRL(recebido)}
            </p>
          </div>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900">
              Em aberto
            </p>
            <p className="font-mono text-sm font-bold text-amber-900">
              {formatBRL(aberto)}
            </p>
          </div>
          <div className="rounded-md border border-red-200 bg-red-50 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-800">
              Em atraso
            </p>
            <p className="font-mono text-sm font-bold text-red-900">
              {formatBRL(atraso)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
