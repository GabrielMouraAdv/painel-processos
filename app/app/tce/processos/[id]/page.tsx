import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  FileText,
  Gavel,
  Link2,
  X,
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
import {
  DocumentosSection,
  type DocumentoItem,
} from "@/components/documentos/documentos-section";
import { authOptions } from "@/lib/auth";
import { TIPOS_DOCUMENTO_TCE } from "@/lib/documento-config";
import { prisma } from "@/lib/prisma";
import { computeTceAlertas } from "@/lib/tce-alertas";
import {
  TCE_CAMARAS,
  TCE_CAMARA_LABELS,
  TCE_RECURSO_LABELS,
  TCE_TIPO_LABELS,
  faseTceLabel,
} from "@/lib/tce-config";
import { cn } from "@/lib/utils";

import { AndamentoTceForm } from "./andamento-tce-form";
import { BancasSection } from "./bancas-section";
import {
  InteressadosTceManager,
  type InteressadoItem,
} from "./interessados-tce-manager";
import { PrazosTceCardActions, type PrazoTceItem } from "./prazo-tce-actions";
import { RecursosSection } from "./recursos-section";
import { StatusAcoesSection } from "./status-acoes-section";

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
      prazos: {
        orderBy: { dataVencimento: "asc" },
        include: { advogadoResp: { select: { id: true, nome: true } } },
      },
      documentos: {
        orderBy: { createdAt: "desc" },
        include: { uploadedByUser: { select: { nome: true } } },
      },
      processoOrigem: {
        select: { id: true, numero: true, tipo: true },
      },
    },
  });

  if (!processo) notFound();

  // Recursos vinculados (ProcessoTce com processoOrigemId = processo.id),
  // recursivos para mostrar arvore.
  type RecursoLite = {
    id: string;
    numero: string;
    tipoRecurso: NonNullable<typeof processo.tipoRecurso> | null;
    relator: string | null;
    faseAtual: string;
    notaTecnica: boolean;
    parecerMpco: boolean;
    memorialPronto: boolean;
    despachadoComRelator: boolean;
    dataAutuacao: string | null;
    processoOrigemId: string | null;
    prazosAbertos: number;
    prazoMaisProximo: { tipo: string; data: string } | null;
  };

  // Pega TODOS os recursos descendentes (recursivo) via uma busca por toda a
  // arvore: comeca pelos filhos diretos, depois filhos dos filhos.
  async function carregarRecursosDescendentes(
    raizId: string,
  ): Promise<RecursoLite[]> {
    const todos: RecursoLite[] = [];
    const fila: string[] = [raizId];
    const visitados = new Set<string>();
    while (fila.length > 0) {
      const lote = fila.splice(0, fila.length);
      const filhos = await prisma.processoTce.findMany({
        where: {
          escritorioId,
          ehRecurso: true,
          processoOrigemId: { in: lote },
        },
        orderBy: [{ dataAutuacao: "asc" }, { createdAt: "asc" }],
        include: {
          prazos: {
            where: { cumprido: false },
            orderBy: { dataVencimento: "asc" },
            take: 1,
            select: { tipo: true, dataVencimento: true },
          },
          _count: {
            select: { prazos: { where: { cumprido: false } } },
          },
        },
      });
      for (const f of filhos) {
        if (visitados.has(f.id)) continue;
        visitados.add(f.id);
        const primeiro = f.prazos[0];
        todos.push({
          id: f.id,
          numero: f.numero,
          tipoRecurso: f.tipoRecurso,
          relator: f.relator,
          faseAtual: f.faseAtual,
          notaTecnica: f.notaTecnica,
          parecerMpco: f.parecerMpco,
          memorialPronto: f.memorialPronto,
          despachadoComRelator: f.despachadoComRelator,
          dataAutuacao: f.dataAutuacao ? f.dataAutuacao.toISOString() : null,
          processoOrigemId: f.processoOrigemId,
          prazosAbertos: f._count.prazos,
          prazoMaisProximo: primeiro
            ? {
                tipo: primeiro.tipo,
                data: primeiro.dataVencimento.toISOString(),
              }
            : null,
        });
        fila.push(f.id);
      }
    }
    return todos;
  }
  const recursosLista = await carregarRecursosDescendentes(processo.id);

  const [gestores, advogados] = await Promise.all([
    prisma.gestor.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        tipoInteressado: true,
        nomeFantasia: true,
      },
    }),
    prisma.user.findMany({
      where: { escritorioId, role: Role.ADVOGADO },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

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
    prorrogacaoPedida: p.prorrogacaoPedida,
    dataProrrogacao: p.dataProrrogacao ? p.dataProrrogacao.toISOString() : null,
    cumprido: p.cumprido,
    observacoes: p.observacoes,
    advogadoResp: p.advogadoResp
      ? { id: p.advogadoResp.id, nome: p.advogadoResp.nome }
      : null,
  }));

  const alertas = computeTceAlertas({
    notaTecnica: processo.notaTecnica,
    parecerMpco: processo.parecerMpco,
    despachadoComRelator: processo.despachadoComRelator,
    memorialPronto: processo.memorialPronto,
    despachoDispensado: processo.despachoDispensado,
  });

  const documentos: DocumentoItem[] = processo.documentos.map((d) => ({
    id: d.id,
    nome: d.nome,
    url: d.url,
    tipo: d.tipo,
    tamanho: d.tamanho,
    createdAt: d.createdAt.toISOString(),
    uploadedByNome: d.uploadedByUser.nome,
  }));

  // Memorial mais recente (para o card Memorial mostrar link de download).
  const memorialDoc = (() => {
    const m = processo.documentos.find(
      (d) => d.tipo.toLowerCase() === "memorial",
    );
    if (!m) return null;
    return {
      id: m.id,
      nome: m.nome,
      url: m.url,
      createdAt: m.createdAt.toISOString(),
      uploadedByNome: m.uploadedByUser.nome,
    };
  })();

  // Nomes dos advogados do agendamento (memorial / despacho).
  const advNomePorId = new Map(advogados.map((a) => [a.id, a.nome]));
  const memorialAgendadoAdvogadoNome = processo.memorialAgendadoAdvogadoId
    ? advNomePorId.get(processo.memorialAgendadoAdvogadoId) ?? null
    : null;
  const despachoAgendadoAdvogadoNome = processo.despachoAgendadoAdvogadoId
    ? advNomePorId.get(processo.despachoAgendadoAdvogadoId) ?? null
    : null;

  const canDeleteDocumentos = session!.user.role === Role.ADMIN;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/app/tce/processos">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para processos TCE
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs text-muted-foreground">
              {processo.numero}
            </p>
            {processo.ehRecurso && processo.tipoRecurso && (
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-purple-800">
                {TCE_RECURSO_LABELS[processo.tipoRecurso]}
              </span>
            )}
            <BancaBadgeList slugs={processo.bancasSlug} size="sm" />
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy md:text-3xl">
            {TCE_TIPO_LABELS[processo.tipo]}
          </h1>
          {processo.ehRecurso && processo.processoOrigem && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm">
              <Link2 className="h-3.5 w-3.5 text-purple-700" />
              <span className="text-muted-foreground">Processo de origem:</span>
              <Link
                href={`/app/tce/processos/${processo.processoOrigem.id}`}
                className="font-mono font-semibold text-brand-navy hover:underline"
              >
                {processo.processoOrigem.numero}
              </Link>
            </p>
          )}
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
          <BoolBadge
            label="Nota Tecnica"
            value={processo.notaTecnica}
            href="#card-nt"
          />
          <BoolBadge
            label="Parecer MPCO"
            value={processo.parecerMpco}
            href="#card-mpco"
          />
          <BoolBadge
            label="Despachado"
            value={processo.despachadoComRelator}
            href="#card-despacho"
          />
          <BoolBadge
            label="Memorial"
            value={processo.memorialPronto}
            href="#card-memorial"
          />
        </div>
      </header>

      {alertas.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Alertas automaticos
            </CardTitle>
            <CardDescription className="text-amber-800">
              Acoes sugeridas com base nos marcadores do processo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertas.map((a) => (
              <div
                key={a.key}
                className="flex items-start gap-2 rounded-md border border-amber-200 bg-white p-3 text-sm"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">{a.titulo}</p>
                  <p className="text-xs text-amber-800">{a.descricao}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <BancasSection
        processoId={processo.id}
        initialBancas={processo.bancasSlug}
      />

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

      <StatusAcoesSection
        processoId={processo.id}
        tipo={processo.tipo}
        julgamento={{
          julgado: processo.julgado,
          dataJulgamento: processo.dataJulgamento
            ? processo.dataJulgamento.toISOString()
            : null,
          resultadoJulgamento: processo.resultadoJulgamento,
          penalidade: processo.penalidade,
          valorMulta: processo.valorMulta
            ? Number(processo.valorMulta)
            : null,
          valorDevolucao: processo.valorDevolucao
            ? Number(processo.valorDevolucao)
            : null,
          observacoesJulgamento: processo.observacoesJulgamento,
        }}
        notaTecnica={processo.notaTecnica}
        parecerMpco={processo.parecerMpco}
        contrarrazoesNtApresentadas={processo.contrarrazoesNtApresentadas}
        contrarrazoesMpcoApresentadas={processo.contrarrazoesMpcoApresentadas}
        contrarrazoesNtDispensado={
          processo.contrarrazoesNtDispensadas &&
          processo.contrarrazoesNtDispensadoPor &&
          processo.contrarrazoesNtDispensadoEm
            ? {
                por: processo.contrarrazoesNtDispensadoPor,
                em: processo.contrarrazoesNtDispensadoEm.toISOString(),
                motivo: processo.contrarrazoesNtDispensadoMotivo ?? null,
              }
            : null
        }
        contrarrazoesMpcoDispensado={
          processo.contrarrazoesMpcoDispensadas &&
          processo.contrarrazoesMpcoDispensadoPor &&
          processo.contrarrazoesMpcoDispensadoEm
            ? {
                por: processo.contrarrazoesMpcoDispensadoPor,
                em: processo.contrarrazoesMpcoDispensadoEm.toISOString(),
                motivo: processo.contrarrazoesMpcoDispensadoMotivo ?? null,
              }
            : null
        }
        memorialPronto={processo.memorialPronto}
        memorialDispensado={
          processo.memorialDispensado &&
          processo.memorialDispensadoPor &&
          processo.memorialDispensadoEm
            ? {
                por: processo.memorialDispensadoPor,
                em: processo.memorialDispensadoEm.toISOString(),
                motivo: processo.memorialDispensadoMotivo ?? null,
              }
            : null
        }
        despachadoComRelator={processo.despachadoComRelator}
        despachoDispensado={
          processo.despachoDispensado &&
          processo.despachoDispensadoPor &&
          processo.despachoDispensadoEm
            ? {
                por: processo.despachoDispensadoPor,
                em: processo.despachoDispensadoEm.toISOString(),
                motivo: processo.despachoDispensadoMotivo ?? null,
              }
            : null
        }
        dataDespacho={
          processo.dataDespacho ? processo.dataDespacho.toISOString() : null
        }
        retornoDespacho={processo.retornoDespacho}
        memorialAgendadoData={
          processo.memorialAgendadoData
            ? processo.memorialAgendadoData.toISOString()
            : null
        }
        memorialAgendadoAdvogadoNome={memorialAgendadoAdvogadoNome}
        despachoAgendadoData={
          processo.despachoAgendadoData
            ? processo.despachoAgendadoData.toISOString()
            : null
        }
        despachoAgendadoAdvogadoNome={despachoAgendadoAdvogadoNome}
        memorialDoc={memorialDoc}
        advogados={advogados}
      />

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
            <PrazosTceCardActions
              processoId={processo.id}
              processoTipo={processo.tipo}
              prazos={prazos}
              advogados={advogados}
            />
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
            advogados={advogados}
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

      <RecursosSection
        processoId={processo.id}
        baseNumero={processo.numero}
        bancasOrigem={processo.bancasSlug}
        recursos={recursosLista}
      />

      <DocumentosSection
        escopo="tce"
        processoId={processo.id}
        documentos={documentos}
        tiposDocumento={TIPOS_DOCUMENTO_TCE}
        canDelete={canDeleteDocumentos}
      />
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

function BoolBadge({
  label,
  value,
  href,
}: {
  label: string;
  value: boolean;
  href?: string;
}) {
  const className = cn(
    "inline-flex items-center gap-1 rounded-full border px-2 py-1",
    value
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-slate-200 bg-slate-50 text-slate-600",
    href && "transition-colors hover:bg-opacity-80 hover:underline",
  );
  if (href) {
    return (
      <a href={href} className={className}>
        <StatusIcon active={value} />
        {label}
      </a>
    );
  }
  return (
    <span className={className}>
      <StatusIcon active={value} />
      {label}
    </span>
  );
}
