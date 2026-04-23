import { getServerSession } from "next-auth";
import { Tribunal, type Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { PrazosView, type PrazoItem } from "./prazos-view";

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function parseTribunal(v: string): Tribunal | undefined {
  return (Object.values(Tribunal) as string[]).includes(v)
    ? (v as Tribunal)
    : undefined;
}

export default async function PrazosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const tribunal = parseTribunal(asString(searchParams.tribunal));
  const advogadoId = asString(searchParams.advogadoId);
  const status = asString(searchParams.status);
  const de = asString(searchParams.de);
  const ate = asString(searchParams.ate);

  const processoFilter: Prisma.ProcessoWhereInput = {
    escritorioId,
    ...(tribunal && { tribunal }),
    ...(advogadoId && { advogadoId }),
  };

  const where: Prisma.PrazoWhereInput = {
    processo: processoFilter,
    ...(status === "cumprido" && { cumprido: true }),
    ...(status === "pendente" && { cumprido: false }),
    ...((de || ate) && {
      data: {
        ...(de && { gte: new Date(de) }),
        ...(ate && { lte: new Date(`${ate}T23:59:59`) }),
      },
    }),
  };

  const [prazos, processos, advogados] = await Promise.all([
    prisma.prazo.findMany({
      where,
      orderBy: { data: "asc" },
      include: {
        processo: {
          select: {
            id: true,
            numero: true,
            tribunal: true,
            advogadoId: true,
            gestor: { select: { nome: true } },
          },
        },
      },
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
    prisma.user.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const items: PrazoItem[] = prazos.map((p) => ({
    id: p.id,
    tipo: p.tipo,
    data: p.data.toISOString(),
    hora: p.hora,
    observacoes: p.observacoes,
    cumprido: p.cumprido,
    geradoAuto: p.geradoAuto,
    origemFase: p.origemFase,
    processo: {
      id: p.processo.id,
      numero: p.processo.numero,
      tribunal: p.processo.tribunal,
      advogadoId: p.processo.advogadoId,
      gestor: { nome: p.processo.gestor.nome },
    },
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
      <PrazosView
        prazos={items}
        processos={processos.map((p) => ({
          id: p.id,
          numero: p.numero,
          gestor: p.gestor.nome,
        }))}
        advogados={advogados}
        initialFilters={{
          tribunal: tribunal ?? "",
          advogadoId,
          status,
          de,
          ate,
        }}
      />
    </div>
  );
}
