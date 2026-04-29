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

import { KpiCardsTce } from "./kpi-cards-tce";
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
    ...(semDespacho && { despachadoComRelator: false }),
    ...(memorialFiltro === "pendente" && { memorialPronto: false }),
    ...(contrarrazoesFiltro === "pendentes" && {
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
      where,
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
      where: { escritorioId, despachadoComRelator: false },
    }),
    prisma.processoTce.count({
      where: { escritorioId, memorialPronto: false },
    }),
    prisma.processoTce.count({
      where: {
        escritorioId,
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
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Processos TCE
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
              Ver Pendencias
            </Link>
          </Button>
          <NovoProcessoTceButton
            municipios={municipiosTodos}
            gestores={todosGestores}
            defaultBancaSlug={userBancaSlug}
          />
        </div>
      </header>

      <KpiCardsTce
        total={total}
        comPrazoAberto={comPrazoAberto}
        emPauta={emPauta}
        semDespacho={semDespachoCount}
        memoriaisPendentes={memoriaisPendentes}
        contrarrazoesPendentes={contrarrazoesPendentes}
      />

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
