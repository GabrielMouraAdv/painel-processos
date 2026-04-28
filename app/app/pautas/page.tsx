import { getServerSession } from "next-auth";
import { Role, type Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { parseBancasParam } from "@/lib/bancas";
import { podeEditarPauta } from "@/lib/pauta-permissions";
import { prisma } from "@/lib/prisma";
import {
  endOfWeekUTC,
  isoDay,
  parseISODate,
  startOfWeekUTC,
} from "@/lib/semana";
import {
  COMPOSICAO,
  ORGAOS_JULGADORES,
  TIPOS_RECURSO,
  orgaosJulgadoresList,
  todosDesembargadores,
} from "@/lib/tjpe-config";
import {
  COMPOSICAO_TRF5,
  ORGAOS_JULGADORES_TRF5,
  TIPOS_RECURSO_TRF5,
  orgaosJulgadoresTrf5List,
  todosDesembargadoresTrf5,
} from "@/lib/trf5-config";

import {
  PautasJudiciaisView,
  type OrgaoJulgadorOption,
  type ComposicaoRecord,
  type SessaoRow,
  type TribunalKey,
} from "./pautas-view";

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function horaToNum(h?: string): number {
  if (!h) return 999;
  const m = /^(\d+)/.exec(h.trim());
  return m ? parseInt(m[1], 10) : 999;
}

function resolveTribunal(v: string): TribunalKey {
  return v === "TRF5" ? "TRF5" : "TJPE";
}

function configForTribunal(tribunal: TribunalKey): {
  orgaos: OrgaoJulgadorOption[];
  composicao: ComposicaoRecord;
  tiposRecurso: string[];
  desembargadores: string[];
  horarioPorOrgao: (orgao: string) => string | undefined;
} {
  if (tribunal === "TRF5") {
    return {
      orgaos: orgaosJulgadoresTrf5List().map((o) => ({
        label: o.label,
        horario: o.horario ?? null,
      })),
      composicao: Object.fromEntries(
        Object.entries(COMPOSICAO_TRF5).map(([k, v]) => [
          k,
          v.map((m) => ({
            nome: m.nome,
            cargo: m.cargo,
            observacao: m.observacao ?? null,
          })),
        ]),
      ),
      tiposRecurso: TIPOS_RECURSO_TRF5,
      desembargadores: todosDesembargadoresTrf5(),
      horarioPorOrgao: (o) => ORGAOS_JULGADORES_TRF5[o]?.horario,
    };
  }
  return {
    orgaos: orgaosJulgadoresList().map((o) => ({
      label: o.label,
      horario: o.horario ?? null,
    })),
    composicao: Object.fromEntries(
      Object.entries(COMPOSICAO).map(([k, v]) => [
        k,
        v.map((m) => ({
          nome: m.nome,
          cargo: m.cargo,
          observacao: m.observacao ?? null,
        })),
      ]),
    ),
    tiposRecurso: TIPOS_RECURSO,
    desembargadores: todosDesembargadores(),
    horarioPorOrgao: (o) => ORGAOS_JULGADORES[o]?.horario,
  };
}

export default async function PautasJudiciaisPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;
  const canEdit = podeEditarPauta(session!.user.role);

  const tribunal = resolveTribunal(asString(searchParams.tribunal));
  const cfg = configForTribunal(tribunal);

  const semanaParam = asString(searchParams.semana);
  const ref = parseISODate(semanaParam) ?? new Date();
  const weekStart = startOfWeekUTC(ref);
  const weekEnd = endOfWeekUTC(weekStart);

  const orgaoJulgador = asString(searchParams.orgaoJulgador);
  const tipoSessao = asString(searchParams.tipoSessao);
  const relator = asString(searchParams.relator).trim();
  const advogadoResp = asString(searchParams.advogadoResp).trim();
  const q = asString(searchParams.q).trim();
  const bancasFiltro = parseBancasParam(searchParams.banca);

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
    ...(bancasFiltro.length > 0 && {
      processo: { bancasSlug: { hasSome: bancasFiltro } },
    }),
  };

  const temFiltroItem = !!(
    relator ||
    advogadoResp ||
    q ||
    bancasFiltro.length > 0
  );

  const where: Prisma.SessaoJudicialWhereInput = {
    escritorioId,
    tribunal,
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
                select: { id: true, numero: true, bancasSlug: true },
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
    const ha = horaToNum(cfg.horarioPorOrgao(a.orgaoJulgador));
    const hb = horaToNum(cfg.horarioPorOrgao(b.orgaoJulgador));
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
      parecerMpf: i.parecerMpf,
      processo: i.processo
        ? {
            id: i.processo.id,
            numero: i.processo.numero,
            bancasSlug: i.processo.bancasSlug,
          }
        : null,
      ordem: i.ordem,
    })),
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <PautasJudiciaisView
        tribunal={tribunal}
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
        desembargadores={cfg.desembargadores}
        processosJudiciais={processosJudiciais.map((p) => ({
          id: p.id,
          numero: p.numero,
          gestor: p.gestor.nome,
        }))}
        orgaosJulgadores={cfg.orgaos}
        composicao={cfg.composicao}
        tiposRecurso={cfg.tiposRecurso}
        canEdit={canEdit}
      />
    </div>
  );
}
