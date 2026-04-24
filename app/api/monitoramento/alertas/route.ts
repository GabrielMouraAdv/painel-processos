import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { detectaDecisao } from "@/lib/monitoramento-detect";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const [movimentacoes, publicacoes] = await Promise.all([
    prisma.movimentacaoAutomatica.findMany({
      where: { lida: false, processo: { escritorioId } },
      orderBy: { dataMovimento: "desc" },
      include: {
        processo: {
          select: {
            id: true,
            numero: true,
            tribunal: true,
            gestor: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.publicacaoDJEN.findMany({
      where: { lida: false, processo: { escritorioId } },
      orderBy: { dataPublicacao: "desc" },
      include: {
        processo: {
          select: {
            id: true,
            numero: true,
            tribunal: true,
            gestor: { select: { nome: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    movimentacoes: movimentacoes.map((m) => ({
      id: m.id,
      tipo: "movimentacao" as const,
      data: m.dataMovimento.toISOString(),
      nome: m.nomeMovimento,
      complementos: m.complementos,
      ehDecisao: detectaDecisao(m.nomeMovimento),
      processo: {
        id: m.processo.id,
        numero: m.processo.numero,
        tribunal: m.processo.tribunal,
        gestor: m.processo.gestor.nome,
      },
    })),
    publicacoes: publicacoes.map((p) => ({
      id: p.id,
      tipo: "publicacao" as const,
      data: p.dataPublicacao.toISOString(),
      conteudo: p.conteudo,
      caderno: p.caderno,
      pagina: p.pagina,
      geraIntimacao: p.geraIntimacao,
      processo: {
        id: p.processo.id,
        numero: p.processo.numero,
        tribunal: p.processo.tribunal,
        gestor: p.processo.gestor.nome,
      },
    })),
  });
}
