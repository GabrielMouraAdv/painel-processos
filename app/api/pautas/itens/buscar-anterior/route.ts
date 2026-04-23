import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const url = new URL(req.url);
  const numero = (url.searchParams.get("numero") ?? "").trim();
  const excludeSessaoId = url.searchParams.get("excludeSessaoId");

  if (!numero) {
    return NextResponse.json({ error: "Informe o numero" }, { status: 400 });
  }

  const item = await prisma.itemPautaJudicial.findFirst({
    where: {
      numeroProcesso: numero,
      sessao: {
        escritorioId,
        ...(excludeSessaoId && { id: { not: excludeSessaoId } }),
      },
    },
    orderBy: [{ sessao: { data: "desc" } }, { createdAt: "desc" }],
    include: {
      sessao: {
        select: {
          id: true,
          data: true,
          orgaoJulgador: true,
          tipoSessao: true,
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    item: {
      numeroProcesso: item.numeroProcesso,
      tituloProcesso: item.tituloProcesso,
      tipoRecurso: item.tipoRecurso,
      partes: item.partes,
      relator: item.relator,
      advogadoResp: item.advogadoResp,
      situacao: item.situacao,
      prognostico: item.prognostico,
      observacoes: item.observacoes,
      providencia: item.providencia,
      sustentacaoOral: item.sustentacaoOral,
      advogadoSustentacao: item.advogadoSustentacao,
      sessaoVirtual: item.sessaoVirtual,
      pedidoRetPresencial: item.pedidoRetPresencial,
    },
    sessao: {
      id: item.sessao.id,
      data: item.sessao.data.toISOString(),
      orgaoJulgador: item.sessao.orgaoJulgador,
      tipoSessao: item.sessao.tipoSessao,
    },
  });
}
