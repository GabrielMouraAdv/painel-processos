import { getServerSession } from "next-auth";
import { CamaraTce, Role, type Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
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

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const processoFilter: Prisma.ProcessoTceWhereInput = {
    escritorioId,
    ...(municipioId && { municipioId }),
    ...(camara && { camara }),
    ...(numero && { numero: { contains: numero, mode: "insensitive" } }),
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

  // Filtro espelhado para prazos de subprocesso (subprocesso.processoPai herda os filtros do processo)
  const subprocessoPrazoWhere: Prisma.PrazoSubprocessoTceWhereInput = {
    subprocesso: { processoPai: processoFilter },
    ...(advogadoRespId && { advogadoRespId }),
    ...(tipo && { tipo: { contains: tipo, mode: "insensitive" } }),
    ...(status === "cumprido" && { cumprido: true }),
    ...(status === "aberto" && { cumprido: false, dataVencimento: { gte: hoje } }),
    ...(status === "vencido" && {
      cumprido: false,
      dataVencimento: { lt: hoje },
    }),
  };

  const [prazos, prazosSub, processos, advogados, municipios, tiposDistintos] =
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
              municipio: { select: { id: true, nome: true, uf: true } },
              interessados: {
                include: { gestor: { select: { nome: true } } },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      }),
      prisma.prazoSubprocessoTce.findMany({
        where: subprocessoPrazoWhere,
        orderBy: { dataVencimento: "asc" },
        include: {
          subprocesso: {
            select: {
              id: true,
              numero: true,
              tipoRecurso: true,
              processoPai: {
                select: {
                  id: true,
                  numero: true,
                  tipo: true,
                  camara: true,
                  municipio: { select: { id: true, nome: true, uf: true } },
                  interessados: {
                    include: { gestor: { select: { nome: true } } },
                    orderBy: { createdAt: "asc" },
                  },
                },
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

  // Carrega advogados responsaveis dos prazos de subprocesso (sem relation no schema)
  const advRespIds = Array.from(
    new Set(
      prazosSub
        .map((p) => p.advogadoRespId)
        .filter((id): id is string => !!id),
    ),
  );
  const advsMap = advRespIds.length
    ? new Map(
        (
          await prisma.user.findMany({
            where: { id: { in: advRespIds } },
            select: { id: true, nome: true },
          })
        ).map((u) => [u.id, u]),
      )
    : new Map<string, { id: string; nome: string }>();

  const rows: PrazoTceRow[] = [
    ...prazos.map<PrazoTceRow>((p) => ({
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
        municipio: p.processo.municipio,
        interessados: p.processo.interessados.map((i) => ({
          nome: i.gestor.nome,
        })),
      },
      subprocesso: null,
    })),
    ...prazosSub.map<PrazoTceRow>((p) => {
      const adv = p.advogadoRespId
        ? advsMap.get(p.advogadoRespId) ?? null
        : null;
      return {
        id: `sub-${p.id}`,
        tipo: p.tipo,
        dataIntimacao: p.dataIntimacao.toISOString(),
        dataVencimento: p.dataVencimento.toISOString(),
        diasUteis: p.diasUteis,
        prorrogavel: p.prorrogavel,
        prorrogacaoPedida: p.prorrogacaoPedida,
        dataProrrogacao: null,
        cumprido: p.cumprido,
        observacoes: p.observacoes,
        advogadoResp: adv ? { id: adv.id, nome: adv.nome } : null,
        dispensado: p.dispensado,
        dispensadoPor: p.dispensadoPor,
        dispensadoEm: p.dispensadoEm ? p.dispensadoEm.toISOString() : null,
        dispensadoMotivo: p.dispensadoMotivo,
        processo: {
          id: p.subprocesso.processoPai.id,
          numero: p.subprocesso.processoPai.numero,
          tipo: p.subprocesso.processoPai.tipo,
          camara: p.subprocesso.processoPai.camara,
          municipio: p.subprocesso.processoPai.municipio,
          interessados: p.subprocesso.processoPai.interessados.map((i) => ({
            nome: i.gestor.nome,
          })),
        },
        subprocesso: {
          id: p.subprocesso.id,
          numero: p.subprocesso.numero,
          tipoRecursoCode: TCE_RECURSO_CODE[p.subprocesso.tipoRecurso],
        },
      };
    }),
  ].sort(
    (a, b) =>
      new Date(a.dataVencimento).getTime() -
      new Date(b.dataVencimento).getTime(),
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
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
