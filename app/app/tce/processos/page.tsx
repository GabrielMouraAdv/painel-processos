import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  CamaraTce,
  TipoProcessoTce,
  TipoRecursoTce,
  type Prisma,
} from "@prisma/client";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { parseBancasParam } from "@/lib/bancas";
import { diasUteisRestantes } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import { SITUACAO_TCE_LABELS, SITUACOES_TCE, situacaoTce, whereSituacaoTce } from "@/lib/situacao-tce";
import { cn } from "@/lib/utils";

import { NovoProcessoTceButton } from "./novo-processo-tce-button";
import { ProcessosTceFilters } from "./processos-tce-filters";
import {
  ProcessosTceTable,
  type ProcessoTceRow,
} from "./processos-tce-table";

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function parseEnum<T extends string>(
  values: readonly T[],
  v: string,
): T | undefined {
  return values.includes(v as T) ? (v as T) : undefined;
}

export default async function TceProcessosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;
  const userBancaSlug = session!.user.bancaSlug ?? null;

  const q = asString(searchParams.q).trim();
  const tipo = parseEnum(Object.values(TipoProcessoTce), asString(searchParams.tipo));
  const camara = parseEnum(Object.values(CamaraTce), asString(searchParams.camara));
  const relator = asString(searchParams.relator);
  const municipioId = asString(searchParams.municipioId);
  const interessadoId = asString(searchParams.interessadoId);
  const fase = asString(searchParams.fase);
  const situacaoParam = asString(searchParams.situacao);
  const situacao = SITUACOES_TCE.find((x) => x === situacaoParam) ?? null;
  const prazoFiltro = asString(searchParams.prazo);
  const semDespacho = asString(searchParams.semDespacho) === "1";
  const memorialFiltro = asString(searchParams.memorial);
  const contrarrazoesFiltro = asString(searchParams.contrarrazoes);
  const pautaFiltro = asString(searchParams.pauta) === "1";
  const julgamentoFiltro = asString(searchParams.julgamento);
  const bancasFiltro = parseBancasParam(searchParams.banca);
  const filtroOrigemRecurso = asString(searchParams.origem); // "originais" | "recursos" | "" (todos)
  const filtroTipoRecurso = parseEnum(
    Object.values(TipoRecursoTce),
    asString(searchParams.tipoRecurso),
  );

  const where: Prisma.ProcessoTceWhereInput = {
    escritorioId,
    ...(tipo && { tipo }),
    ...(camara && { camara }),
    ...(relator && { relator }),
    ...(municipioId && { municipioId }),
    ...(fase && { faseAtual: fase }),
    ...(bancasFiltro.length > 0 && {
      bancasSlug: { hasSome: bancasFiltro },
    }),
    ...(interessadoId && {
      interessados: { some: { gestorId: interessadoId } },
    }),
    ...(q && {
      OR: [
        { numero: { contains: q, mode: "insensitive" } },
        { relator: { contains: q, mode: "insensitive" } },
        { objeto: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(prazoFiltro === "aberto" && {
      prazos: { some: { cumprido: false } },
    }),
    ...(semDespacho && {
      despachadoComRelator: false,
      julgado: false,
    }),
    ...(memorialFiltro === "pendente" && {
      memorialPronto: false,
      julgado: false,
    }),
    ...(contrarrazoesFiltro === "pendentes" && {
      julgado: false,
      OR: [{ notaTecnica: true }, { parecerMpco: true }],
    }),
    ...(pautaFiltro && {
      faseAtual: { in: ["acordao_1", "referendo_pleno", "acordao_agravo"] },
    }),
    ...(julgamentoFiltro === "julgados" && { julgado: true }),
    ...(julgamentoFiltro === "nao_julgados" && { julgado: false }),
    ...(filtroOrigemRecurso === "originais" && { ehRecurso: false }),
    ...(filtroOrigemRecurso === "recursos" && { ehRecurso: true }),
    ...(filtroTipoRecurso && { tipoRecurso: filtroTipoRecurso, ehRecurso: true }),
  };

  // Abas por situacao: a lista usa a aba escolhida; cada aba conta com os demais filtros.
  const whereLista: Prisma.ProcessoTceWhereInput = situacao
    ? { AND: [where, whereSituacaoTce(situacao)] }
    : where;
  const [contagemTodos, ...contagemSituacao] = await Promise.all([
    prisma.processoTce.count({ where }),
    ...SITUACOES_TCE.map((s) => prisma.processoTce.count({ where: { AND: [where, whereSituacaoTce(s)] } })),
  ]);
  const paramsSemSituacao = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === "situacao" || k === "page" || v === undefined) continue;
    for (const x of Array.isArray(v) ? v : [v]) paramsSemSituacao.append(k, x);
  }
  const linkAba = (s: string | null) => {
    const p = new URLSearchParams(paramsSemSituacao);
    if (s) p.set("situacao", s);
    const q = p.toString();
    return `/app/tce/processos${q ? `?${q}` : ""}`;
  };

  const [
    processos,
    municipios,
    gestoresComVinculo,
    todosGestores,
    relatores,
    total,
    comPrazoAberto,
    emPauta,
    semDespachoCount,
    memoriaisPendentes,
    contrarrazoesPendentes,
  ] = await Promise.all([
    prisma.processoTce.findMany({
      where: whereLista,
      orderBy: { updatedAt: "desc" },
      include: {
        municipio: { select: { id: true, nome: true } },
        interessados: {
          include: { gestor: { select: { nome: true } } },
          orderBy: { createdAt: "asc" },
        },
        prazos: {
          where: { cumprido: false },
          orderBy: { dataVencimento: "asc" },
          take: 1,
          select: { tipo: true, dataVencimento: true },
        },
        processoOrigem: { select: { id: true, numero: true } },
        _count: { select: { recursos: { where: { julgado: false } } } },
      },
    }),
    prisma.municipio.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.gestor.findMany({
      where: {
        escritorioId,
        interessadoProcessosTce: { some: {} },
      },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.gestor.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        cargo: true,
        tipoInteressado: true,
        nomeFantasia: true,
      },
    }),
    prisma.processoTce.findMany({
      where: { escritorioId, relator: { not: null } },
      distinct: ["relator"],
      select: { relator: true },
      orderBy: { relator: "asc" },
    }),
    prisma.processoTce.count({ where: { escritorioId } }),
    prisma.processoTce.count({
      where: { escritorioId, prazos: { some: { cumprido: false } } },
    }),
    prisma.processoTce.count({
      where: {
        escritorioId,
        faseAtual: { in: ["acordao_1", "referendo_pleno", "acordao_agravo"] },
      },
    }),
    prisma.processoTce.count({
      where: { escritorioId, julgado: false, despachadoComRelator: false },
    }),
    prisma.processoTce.count({
      where: { escritorioId, julgado: false, memorialPronto: false },
    }),
    prisma.processoTce.count({
      where: {
        escritorioId,
        julgado: false,
        OR: [{ notaTecnica: true }, { parecerMpco: true }],
      },
    }),
  ]);

  const municipiosTodos = await prisma.municipio.findMany({
    where: { escritorioId },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, uf: true },
  });

  const rows: ProcessoTceRow[] = processos.map((p) => {
    const primeiroPrazo = p.prazos[0];
    return {
      id: p.id,
      numero: p.numero,
      municipio: p.municipio,
      interessados: p.interessados.map((i) => ({ nome: i.gestor.nome })),
      tipo: p.tipo,
      camara: p.camara,
      relator: p.relator,
      faseAtual: p.faseAtual,
      situacao: situacaoTce({
        julgado: p.julgado,
        faseAtual: p.faseAtual,
        dataTransito: p.dataTransito,
        recursosPendentes: p._count.recursos,
        notaTecnica: p.notaTecnica,
        parecerMpco: p.parecerMpco,
      }),
      bancasSlug: p.bancasSlug,
      ehRecurso: p.ehRecurso,
      tipoRecurso: p.tipoRecurso,
      processoOrigem: p.processoOrigem,
      notaTecnica: p.notaTecnica,
      parecerMpco: p.parecerMpco,
      despachadoComRelator: p.despachadoComRelator,
      memorialPronto: p.memorialPronto,
      despachoDispensado:
        p.despachoDispensado &&
        p.despachoDispensadoPor &&
        p.despachoDispensadoEm
          ? {
              por: p.despachoDispensadoPor,
              em: p.despachoDispensadoEm.toISOString(),
            }
          : null,
      memorialDispensado:
        p.memorialDispensado &&
        p.memorialDispensadoPor &&
        p.memorialDispensadoEm
          ? {
              por: p.memorialDispensadoPor,
              em: p.memorialDispensadoEm.toISOString(),
            }
          : null,
      julgado: p.julgado,
      resultadoJulgamento: p.resultadoJulgamento,
      prazoAberto: primeiroPrazo
        ? {
            tipo: primeiroPrazo.tipo,
            dataVencimento: primeiroPrazo.dataVencimento.toISOString(),
            diasUteisRestantes: diasUteisRestantes(
              primeiroPrazo.dataVencimento,
            ),
          }
        : null,
    };
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tribunal de Contas
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-tinta md:text-4xl">
            Processos
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} processo{total === 1 ? "" : "s"} cadastrado
            {total === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/app/tce/pendencias">
              <AlertTriangle className="mr-2 h-4 w-4 text-rose-600" />
              Ver Pendências
            </Link>
          </Button>
          <NovoProcessoTceButton
            municipios={municipiosTodos}
            gestores={todosGestores}
            defaultBancaSlug={userBancaSlug}
          />
        </div>
      </header>

      {/* Abas por situacao (Direcao A), no lugar dos cartoes coloridos */}
      <nav className="flex flex-wrap gap-1 border-b" aria-label="Situação">
        {[{ s: null as string | null, label: "Todos", n: contagemTodos }, ...SITUACOES_TCE.map((s, i) => ({ s: s as string | null, label: SITUACAO_TCE_LABELS[s], n: contagemSituacao[i] }))]
          .filter((a) => a.s === null || a.n > 0 || a.s === situacao)
          .map((a) => {
            const on = (situacao ?? null) === a.s;
            return (
              <Link
                key={a.label}
                href={linkAba(a.s)}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "-mb-px flex min-h-[44px] items-center gap-1.5 border-b-2 px-3 text-sm",
                  on ? "border-brand-navy font-semibold text-brand-navy" : "border-transparent text-muted-foreground hover:text-brand-tinta",
                )}
              >
                {a.label}
                <span className="font-mono text-xs text-muted-foreground">{a.n}</span>
              </Link>
            );
          })}
      </nav>
      <p className="-mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <span>Atalhos:</span>
        <Link href="/app/tce/processos?prazo=aberto" className="hover:text-brand-navy hover:underline">Com prazo aberto <span className="font-mono">{comPrazoAberto}</span></Link>
        <Link href="/app/tce/processos?pauta=1" className="hover:text-brand-navy hover:underline">Em pauta <span className="font-mono">{emPauta}</span></Link>
        <Link href="/app/tce/processos?semDespacho=1" className="hover:text-brand-navy hover:underline">Sem despacho <span className="font-mono">{semDespachoCount}</span></Link>
        <Link href="/app/tce/processos?memorial=pendente" className="hover:text-brand-navy hover:underline">Memoriais pendentes <span className="font-mono">{memoriaisPendentes}</span></Link>
        <Link href="/app/tce/processos?contrarrazoes=pendentes" className="hover:text-brand-navy hover:underline">Contrarrazões pendentes <span className="font-mono">{contrarrazoesPendentes}</span></Link>
      </p>

      <ProcessosTceFilters
        municipios={municipios.map((m) => ({ id: m.id, label: m.nome }))}
        interessados={gestoresComVinculo.map((g) => ({
          id: g.id,
          label: g.nome,
        }))}
        relatores={relatores
          .map((r) => r.relator)
          .filter((r): r is string => !!r)}
      />

      <ProcessosTceTable processos={rows} />
    </div>
  );
}
