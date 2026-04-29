import { getServerSession } from "next-auth";
import { CamaraTce, Role, type Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { parseBancasParam } from "@/lib/bancas";
import { prisma } from "@/lib/prisma";
import { TCE_RECURSO_CODE } from "@/lib/tce-config";

import { PrazosTceView, type PrazoTceRow } from "./prazos-tce-view";

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function parseEnum<T extends string>(
  values: readonly T[],
  v: string,
): T | undefined {
  return values.includes(v as T) ? (v as T) : undefined;
}

export default async function TcePrazosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const advogadoRespId = asString(searchParams.advogadoRespId);
  const tipo = asString(searchParams.tipo);
  const municipioId = asString(searchParams.municipioId);
  const status = asString(searchParams.status);
  const numero = asString(searchParams.numero).trim();
  const camara = parseEnum(
    Object.values(CamaraTce),
    asString(searchParams.camara),
  );
  const bancasFiltro = parseBancasParam(searchParams.banca);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const processoFilter: Prisma.ProcessoTceWhereInput = {
    escritorioId,
    ...(municipioId && { municipioId }),
    ...(camara && { camara }),
    ...(numero && { numero: { contains: numero, mode: "insensitive" } }),
    ...(bancasFiltro.length > 0 && {
      bancasSlug: { hasSome: bancasFiltro },
    }),
  };

  const where: Prisma.PrazoTceWhereInput = {
    processo: processoFilter,
    ...(advogadoRespId && { advogadoRespId }),
    ...(tipo && { tipo: { contains: tipo, mode: "insensitive" } }),
    ...(status === "cumprido" && { cumprido: true }),
    ...(status === "aberto" && { cumprido: false, dataVencimento: { gte: hoje } }),
    ...(status === "vencido" && {
      cumprido: false,
      dataVencimento: { lt: hoje },
    }),
  };

  const [prazos, processos, advogados, municipios, tiposDistintos] =
    await Promise.all([
      prisma.prazoTce.findMany({
        where,
        orderBy: { dataVencimento: "asc" },
        include: {
          advogadoResp: { select: { id: true, nome: true } },
          processo: {
            select: {
              id: true,
              numero: true,
              tipo: true,
              camara: true,
              bancasSlug: true,
              ehRecurso: true,
              tipoRecurso: true,
              processoOrigem: { select: { id: true, numero: true } },
              municipio: { select: { id: true, nome: true, uf: true } },
              interessados: {
                include: { gestor: { select: { nome: true } } },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      }),
      prisma.processoTce.findMany({
        where: { escritorioId },
        orderBy: { numero: "asc" },
        select: {
          id: true,
          numero: true,
          municipio: { select: { nome: true } },
        },
      }),
      prisma.user.findMany({
        where: { escritorioId, role: Role.ADVOGADO },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
      prisma.municipio.findMany({
        where: { escritorioId },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true, uf: true },
      }),
      prisma.prazoTce.findMany({
        where: { processo: { escritorioId } },
        distinct: ["tipo"],
        orderBy: { tipo: "asc" },
        select: { tipo: true },
      }),
    ]);

  const rows: PrazoTceRow[] = prazos.map<PrazoTceRow>((p) => ({
    id: p.id,
    tipo: p.tipo,
    dataIntimacao: p.dataIntimacao.toISOString(),
    dataVencimento: p.dataVencimento.toISOString(),
    diasUteis: p.diasUteis,
    prorrogavel: p.prorrogavel,
    prorrogacaoPedida: p.prorrogacaoPedida,
    dataProrrogacao: p.dataProrrogacao
      ? p.dataProrrogacao.toISOString()
      : null,
    cumprido: p.cumprido,
    observacoes: p.observacoes,
    advogadoResp: p.advogadoResp
      ? { id: p.advogadoResp.id, nome: p.advogadoResp.nome }
      : null,
    dispensado: p.dispensado,
    dispensadoPor: p.dispensadoPor,
    dispensadoEm: p.dispensadoEm ? p.dispensadoEm.toISOString() : null,
    dispensadoMotivo: p.dispensadoMotivo,
    processo: {
      id: p.processo.id,
      numero: p.processo.numero,
      tipo: p.processo.tipo,
      camara: p.processo.camara,
      bancasSlug: p.processo.bancasSlug,
      municipio: p.processo.municipio,
      interessados: p.processo.interessados.map((i) => ({
        nome: i.gestor.nome,
      })),
    },
    recurso:
      p.processo.ehRecurso && p.processo.tipoRecurso && p.processo.processoOrigem
        ? {
            tipoRecursoCode: TCE_RECURSO_CODE[p.processo.tipoRecurso],
            origem: {
              id: p.processo.processoOrigem.id,
              numero: p.processo.processoOrigem.numero,
            },
          }
        : null,
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <PrazosTceView
        prazos={rows}
        processos={processos.map((p) => ({
          id: p.id,
          numero: p.numero,
          municipio: p.municipio?.nome ?? null,
        }))}
        advogados={advogados}
        municipios={municipios}
        tipos={tiposDistintos.map((t) => t.tipo)}
        initialFilters={{
          advogadoRespId,
          tipo,
          municipioId,
          status,
          camara: camara ?? "",
          numero,
        }}
      />
    </div>
  );
}
