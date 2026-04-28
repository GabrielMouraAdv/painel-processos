import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { getServerSession } from "next-auth";
import {
  Grau,
  type Prisma,
  Risco,
  TipoProcesso,
  Tribunal,
} from "@prisma/client";

import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { parseBancasParam } from "@/lib/bancas";
import { prisma } from "@/lib/prisma";
import { fasesEmPauta } from "@/lib/processo-labels";

import { KpiCards } from "./kpi-cards";
import { Pagination } from "./pagination";
import { ProcessosFilters } from "./processos-filters";
import { ProcessosTable } from "./processos-table";

const PAGE_SIZE = 20;

function asString(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseEnum<T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined {
  if (!v) return undefined;
  return (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const q = asString(searchParams.q);
  const tribunal = parseEnum(asString(searchParams.tribunal), Object.values(Tribunal));
  const tipo = parseEnum(asString(searchParams.tipo), Object.values(TipoProcesso));
  const risco = parseEnum(asString(searchParams.risco), Object.values(Risco));
  const grau = parseEnum(asString(searchParams.grau), Object.values(Grau));
  const status = asString(searchParams.status);
  const julgamentoFiltro = asString(searchParams.julgamento);
  const bancasFiltro = parseBancasParam(searchParams.banca);
  const page = Math.max(1, Number(asString(searchParams.page) ?? "1") || 1);

  const sessentaDiasAtras = new Date();
  sessentaDiasAtras.setDate(sessentaDiasAtras.getDate() - 60);

  const where: Prisma.ProcessoWhereInput = {
    escritorioId,
    ...(tribunal && { tribunal }),
    ...(tipo && { tipo }),
    ...(risco && { risco }),
    ...(grau && { grau }),
    ...(bancasFiltro.length > 0 && {
      bancasSlug: { hasSome: bancasFiltro },
    }),
    ...(status === "parados" && {
      andamentos: { none: { data: { gte: sessentaDiasAtras } } },
    }),
    ...(status === "em-pauta" && { fase: { in: fasesEmPauta } }),
    ...(julgamentoFiltro === "julgados" && { julgado: true }),
    ...(julgamentoFiltro === "nao_julgados" && { julgado: false }),
    ...(q && {
      OR: [
        { numero: { contains: q, mode: "insensitive" } },
        { gestor: { is: { nome: { contains: q, mode: "insensitive" } } } },
        { gestor: { is: { observacoes: { contains: q, mode: "insensitive" } } } },
      ],
    }),
  };

  const baseEscritorio: Prisma.ProcessoWhereInput = { escritorioId };

  const [total, processos, totalKpi, altoKpi, medioKpi, paradosKpi, emPautaKpi] = await Promise.all([
    prisma.processo.count({ where }),
    prisma.processo.findMany({
      where,
      orderBy: { dataDistribuicao: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        tipoLivre: true,
        id: true,
        numero: true,
        tipo: true,
        tribunal: true,
        risco: true,
        grau: true,
        fase: true,
        julgado: true,
        resultadoJulgamento: true,
        bancasSlug: true,
        gestor: { select: { nome: true, municipio: true } },
      },
    }),
    prisma.processo.count({ where: baseEscritorio }),
    prisma.processo.count({ where: { ...baseEscritorio, risco: Risco.ALTO } }),
    prisma.processo.count({ where: { ...baseEscritorio, risco: Risco.MEDIO } }),
    prisma.processo.count({
      where: {
        ...baseEscritorio,
        andamentos: { none: { data: { gte: sessentaDiasAtras } } },
      },
    }),
    prisma.processo.count({
      where: { ...baseEscritorio, fase: { in: fasesEmPauta } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
            Processos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e acompanhe todos os processos do escritorio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/app/pendencias">
              <AlertTriangle className="mr-2 h-4 w-4 text-rose-600" />
              Ver Pendencias
            </Link>
          </Button>
          <Button asChild className="bg-brand-navy hover:bg-brand-navy/90">
            <Link href="/app/processos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Processo
            </Link>
          </Button>
        </div>
      </header>

      <KpiCards
        total={totalKpi}
        riscoAlto={altoKpi}
        riscoMedio={medioKpi}
        parados={paradosKpi}
        emPauta={emPautaKpi}
      />

      <ProcessosFilters />

      <ProcessosTable processos={processos} />

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        searchParams={searchParams}
      />
    </div>
  );
}
