import { getServerSession } from "next-auth";
import { CamaraTce, Role, type Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONSELHEIROS_SUBSTITUTOS, TCE_CAMARAS } from "@/lib/tce-config";

import { PautaTceView, type SessaoRow } from "./pauta-tce-view";

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function parseEnum<T extends string>(
  values: readonly T[],
  v: string,
): T | undefined {
  return values.includes(v as T) ? (v as T) : undefined;
}

function parseISODate(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

function startOfWeekUTC(ref: Date): Date {
  const d = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  );
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function endOfWeekUTC(start: Date): Date {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function isoDay(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function PautaTcePage({
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

  const camara = parseEnum(Object.values(CamaraTce), asString(searchParams.camara));
  const relator = asString(searchParams.relator).trim();
  const advogadoResp = asString(searchParams.advogadoResp).trim();
  const q = asString(searchParams.q).trim();

  const itemFilter: Prisma.ItemPautaWhereInput = {
    ...(relator && {
      relator: { contains: relator, mode: "insensitive" },
    }),
    ...(advogadoResp && {
      advogadoResp: { contains: advogadoResp, mode: "insensitive" },
    }),
    ...(q && {
      OR: [
        { numeroProcesso: { contains: q, mode: "insensitive" } },
        { municipio: { contains: q, mode: "insensitive" } },
        { tituloProcesso: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const temFiltroItem = !!(relator || advogadoResp || q);

  const where: Prisma.SessaoPautaWhereInput = {
    escritorioId,
    data: { gte: weekStart, lte: weekEnd },
    ...(camara && { camara }),
    ...(temFiltroItem && { itens: { some: itemFilter } }),
  };

  const [sessoes, advogadosCadastrados, municipiosCadastrados, processosTce] =
    await Promise.all([
      prisma.sessaoPauta.findMany({
        where,
        orderBy: [{ data: "asc" }, { camara: "asc" }],
        include: {
          itens: {
            where: temFiltroItem ? itemFilter : undefined,
            orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
            include: {
              processoTce: { select: { id: true, numero: true } },
            },
          },
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
        select: { id: true, nome: true },
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
    ]);

  const rows: SessaoRow[] = sessoes.map((s) => ({
    id: s.id,
    data: s.data.toISOString(),
    camara: s.camara,
    observacoesGerais: s.observacoesGerais,
    itens: s.itens.map((i) => ({
      id: i.id,
      numeroProcesso: i.numeroProcesso,
      tituloProcesso: i.tituloProcesso,
      municipio: i.municipio,
      exercicio: i.exercicio,
      relator: i.relator,
      advogadoResp: i.advogadoResp,
      situacao: i.situacao,
      observacoes: i.observacoes,
      prognostico: i.prognostico,
      providencia: i.providencia,
      retiradoDePauta: i.retiradoDePauta,
      pedidoVistas: i.pedidoVistas,
      conselheiroVistas: i.conselheiroVistas,
      processoTce: i.processoTce
        ? { id: i.processoTce.id, numero: i.processoTce.numero }
        : null,
      ordem: i.ordem,
    })),
  }));

  const relatoresPadrao = Array.from(
    new Set([
      ...TCE_CAMARAS.PLENO.titulares,
      ...TCE_CAMARAS.PRIMEIRA.titulares,
      ...TCE_CAMARAS.SEGUNDA.titulares,
      ...CONSELHEIROS_SUBSTITUTOS,
    ]),
  ).sort();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
      <PautaTceView
        sessoes={rows}
        weekStart={isoDay(weekStart)}
        weekEnd={isoDay(weekEnd)}
        initialFilters={{
          camara: camara ?? "",
          relator,
          advogadoResp,
          q,
        }}
        advogadosCadastrados={advogadosCadastrados.map((a) => a.nome)}
        municipiosCadastrados={municipiosCadastrados.map((m) => m.nome)}
        relatoresPadrao={relatoresPadrao}
        processosTce={processosTce.map((p) => ({
          id: p.id,
          numero: p.numero,
          municipio: p.municipio?.nome ?? null,
        }))}
      />
    </div>
  );
}
