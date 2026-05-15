import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  buscarPublicacaoNoDJEN,
  ehProcessoTrabalhista,
  montarUpdateDjen,
} from "@/lib/djen-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Anti-abuso: maximo 100 buscas DJEN por dia por processo (mesmo a API sendo publica).
const LIMITE_DIARIO_POR_PROCESSO = 100;

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const processo = await prisma.processo.findFirst({
    where: { id: params.id, escritorioId },
    select: { id: true, numero: true },
  });
  if (!processo) {
    return NextResponse.json({ error: "Processo nao encontrado" }, { status: 404 });
  }

  if (ehProcessoTrabalhista(processo.numero)) {
    return NextResponse.json(
      {
        error: "Processo trabalhista nao suportado.",
        buscados: 0,
        encontrados: 0,
        indisponiveis: 0,
      },
      { status: 400 },
    );
  }

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const buscasHoje = await prisma.movimentacaoAutomatica.count({
    where: {
      processoId: processo.id,
      conteudoIntegralBuscadoEm: { gte: inicioDia },
    },
  });
  const restanteHoje = LIMITE_DIARIO_POR_PROCESSO - buscasHoje;
  if (restanteHoje <= 0) {
    return NextResponse.json(
      {
        error: `Limite diario de ${LIMITE_DIARIO_POR_PROCESSO} buscas atingido para este processo.`,
        buscados: 0,
        encontrados: 0,
        indisponiveis: 0,
      },
      { status: 429 },
    );
  }

  const pendentes = await prisma.movimentacaoAutomatica.findMany({
    where: {
      processoId: processo.id,
      OR: [
        { conteudoIntegralStatus: null },
        { conteudoIntegralStatus: "ERRO_BUSCA" },
        { conteudoIntegralStatus: "INDISPONIVEL" },
      ],
    },
    select: { id: true, dataMovimento: true },
    orderBy: { dataMovimento: "desc" },
    take: restanteHoje,
  });

  let buscados = 0;
  let encontrados = 0;
  let indisponiveis = 0;
  let erros = 0;

  for (const mov of pendentes) {
    buscados++;
    const resultado = await buscarPublicacaoNoDJEN(
      processo.numero,
      mov.dataMovimento,
    );
    const update = montarUpdateDjen(resultado);
    await prisma.movimentacaoAutomatica.update({
      where: { id: mov.id },
      data: update,
    });
    if (resultado.encontrado) encontrados++;
    else if (resultado.motivo === "INDISPONIVEL") indisponiveis++;
    else erros++;
  }

  return NextResponse.json({
    buscados,
    encontrados,
    indisponiveis,
    erros,
  });
}
