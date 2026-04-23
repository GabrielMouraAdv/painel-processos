import { getServerSession } from "next-auth";
import { Role, type Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  endOfWeekUTC,
  isoDay,
  parseISODate,
  startOfWeekUTC,
} from "@/lib/semana";
import {
  ORGAOS_JULGADORES,
  todosDesembargadores,
} from "@/lib/tjpe-config";

import { PautasJudiciaisView, type SessaoRow } from "./pautas-view";

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function horaToNum(h?: string): number {
  if (!h) return 999;
  const m = /^(\d+)h/i.exec(h.trim());
  return m ? parseInt(m[1], 10) : 999;
}

export default async function PautasJudiciaisPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const semanaParam = asString(searchParams.semana);
  const ref = parseISODate(semanaParam) ?? new Date();
  const weekStart = startOfWeekUTC(ref);
  const weekEnd = endOfWeekUTC(weekStart);

  const orgaoJulgador = asString(searchParams.orgaoJulgador);
  const tipoSessao = asString(searchParams.tipoSessao);
  const relator = asString(searchParams.relator).trim();
  const advogadoResp = asString(searchParams.advogadoResp).trim();
  const q = asString(searchParams.q).trim();

  const itemFilter: Prisma.ItemPautaJudicialWhereInput = {
    ...(relator && {
      relator: { contains: relator, mode: "insensitive" },
    }),
    ...(advogadoResp && {
      advogadoResp: { contains: advogadoResp, mode: "insensitive" },
    }),
    ...(q && {
      OR: [
        { numeroProcesso: { contains: q, mode: "insensitive" } },
        { tituloProcesso: { contains: q, mode: "insensitive" } },
        { partes: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const temFiltroItem = !!(relator || advogadoResp || q);

  const where: Prisma.SessaoJudicialWhereInput = {
    escritorioId,
    tribunal: "TJPE",
    data: { gte: weekStart, lte: weekEnd },
    ...(orgaoJulgador && { orgaoJulgador }),
    ...(tipoSessao && { tipoSessao }),
    ...(temFiltroItem && { itens: { some: itemFilter } }),
  };

  const [sessoes, advogadosCadastrados, processosJudiciais] =
    await Promise.all([
      prisma.sessaoJudicial.findMany({
        where,
        orderBy: [{ data: "asc" }],
        include: {
          itens: {
            where: temFiltroItem ? itemFilter : undefined,
            orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
            include: {
              processo: {
                select: { id: true, numero: true },
              },
            },
          },
        },
      }),
      prisma.user.findMany({
        where: { escritorioId, role: Role.ADVOGADO },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      }),
      prisma.processo.findMany({
        where: { escritorioId },
        orderBy: { numero: "asc" },
        select: {
          id: true,
          numero: true,
          gestor: { select: { nome: true } },
        },
      }),
    ]);

  const sessoesOrdenadas = [...sessoes].sort((a, b) => {
    const da = a.data.getTime();
    const db = b.data.getTime();
    if (da !== db) return da - db;
    const ha = horaToNum(ORGAOS_JULGADORES[a.orgaoJulgador]?.horario);
    const hb = horaToNum(ORGAOS_JULGADORES[b.orgaoJulgador]?.horario);
    return ha - hb;
  });

  const rows: SessaoRow[] = sessoesOrdenadas.map((s) => ({
    id: s.id,
    data: s.data.toISOString(),
    tribunal: s.tribunal,
    orgaoJulgador: s.orgaoJulgador,
    tipoSessao: s.tipoSessao,
    observacoesGerais: s.observacoesGerais,
    itens: s.itens.map((i) => ({
      id: i.id,
      numeroProcesso: i.numeroProcesso,
      tituloProcesso: i.tituloProcesso,
      tipoRecurso: i.tipoRecurso,
      partes: i.partes,
      relator: i.relator,
      advogadoResp: i.advogadoResp,
      situacao: i.situacao,
      prognostico: i.prognostico,
      observacoes: i.observacoes,
      providencia: i.providencia,
      sustentacaoOral: i.sustentacaoOral,
      advogadoSustentacao: i.advogadoSustentacao,
      sessaoVirtual: i.sessaoVirtual,
      pedidoRetPresencial: i.pedidoRetPresencial,
      retiradoDePauta: i.retiradoDePauta,
      pedidoVistas: i.pedidoVistas,
      desPedidoVistas: i.desPedidoVistas,
      processo: i.processo
        ? { id: i.processo.id, numero: i.processo.numero }
        : null,
      ordem: i.ordem,
    })),
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
      <PautasJudiciaisView
        sessoes={rows}
        weekStart={isoDay(weekStart)}
        weekEnd={isoDay(weekEnd)}
        initialFilters={{
          orgaoJulgador,
          tipoSessao,
          relator,
          advogadoResp,
          q,
        }}
        advogadosCadastrados={advogadosCadastrados.map((a) => a.nome)}
        desembargadores={todosDesembargadores()}
        processosJudiciais={processosJudiciais.map((p) => ({
          id: p.id,
          numero: p.numero,
          gestor: p.gestor.nome,
        }))}
      />
    </div>
  );
}
