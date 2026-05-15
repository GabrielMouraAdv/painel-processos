import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { buscarPublicacaoNoDJEN, ehProcessoTrabalhista, montarUpdateDjen } from "@/lib/djen-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
// O cliente DJEN tem rate-limiter preventivo + cooldown global em 429
// (ate ~65s por incidente). Damos folga para uma chamada esperar slot
// ou um cooldown completo sem estourar o timeout do edge runtime.
export const maxDuration = 300;

export async function POST(
  _req: Request,
  { params }: { params: { id: string; movId: string } },
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
        error: "Processo trabalhista nao suportado pelo DJEN do painel.",
        status: "TRABALHISTA",
      },
      { status: 400 },
    );
  }

  const mov = await prisma.movimentacaoAutomatica.findFirst({
    where: { id: params.movId, processoId: processo.id },
    select: { id: true, dataMovimento: true },
  });
  if (!mov) {
    return NextResponse.json({ error: "Movimentacao nao encontrada" }, { status: 404 });
  }

  const resultado = await buscarPublicacaoNoDJEN(processo.numero, mov.dataMovimento);
  const update = montarUpdateDjen(resultado);

  await prisma.movimentacaoAutomatica.update({
    where: { id: mov.id },
    data: update,
  });

  return NextResponse.json({
    encontrado: resultado.encontrado,
    status: update.conteudoIntegralStatus,
    conteudoIntegral: update.conteudoIntegral,
    djenLinkOficial: update.djenLinkOficial,
    djenIdPublicacao: update.djenIdPublicacao,
  });
}
