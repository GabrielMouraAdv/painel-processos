import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { ehProcessoTrabalhista } from "@/lib/djen-client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Marca uma movimentacao para ter o inteiro teor buscado no DJEN. NAO chama o
 * DJEN sincronamente — a API publica do CNJ tem rate-limit baixo (20 req/min)
 * compartilhado entre todas as instancias serverless. Fazer a chamada sincrona
 * causa erros "Falha temporaria" sob carga.
 *
 * A busca em si e feita pelo cron `/api/cron/djen-fila` (rodando a cada 5 min),
 * que processa pendentes em ordem com throttle adequado.
 */
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
    select: { id: true, conteudoIntegralStatus: true, conteudoIntegral: true },
  });
  if (!mov) {
    return NextResponse.json({ error: "Movimentacao nao encontrada" }, { status: 404 });
  }

  // Se ja temos o texto, retorna direto sem reagendar.
  if (mov.conteudoIntegralStatus === "DISPONIVEL" && mov.conteudoIntegral) {
    return NextResponse.json({
      encontrado: true,
      status: "DISPONIVEL",
      mensagem: "Texto integral ja disponivel.",
    });
  }

  // Marca como pendente para o cron processar. `conteudoIntegralBuscadoEm`
  // recebe `null` para sinalizar "ainda nao buscado" e o cron pegar.
  await prisma.movimentacaoAutomatica.update({
    where: { id: mov.id },
    data: {
      conteudoIntegralStatus: "PENDENTE",
      conteudoIntegralBuscadoEm: null,
    },
  });

  return NextResponse.json({
    encontrado: false,
    status: "PENDENTE",
    mensagem:
      "Busca adicionada a fila. Texto integral aparecera apos a proxima sincronizacao (ate alguns minutos).",
  });
}
