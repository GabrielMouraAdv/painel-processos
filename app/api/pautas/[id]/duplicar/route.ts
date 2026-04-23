import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { podeEditarPauta } from "@/lib/pauta-permissions";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (!podeEditarPauta(session.user.role)) {
    return NextResponse.json(
      { error: "Sem permissao para duplicar sessao" },
      { status: 403 },
    );
  }

  const escritorioId = session.user.escritorioId;

  const sessao = await prisma.sessaoJudicial.findFirst({
    where: { id: params.id, escritorioId },
    include: {
      itens: {
        orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!sessao) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  const novaData = new Date(sessao.data);
  novaData.setUTCDate(novaData.getUTCDate() + 7);

  const nova = await prisma.sessaoJudicial.create({
    data: {
      escritorioId,
      data: novaData,
      tribunal: sessao.tribunal,
      orgaoJulgador: sessao.orgaoJulgador,
      tipoSessao: sessao.tipoSessao,
      observacoesGerais: sessao.observacoesGerais,
      itens: {
        create: sessao.itens.map((it) => ({
          numeroProcesso: it.numeroProcesso,
          tituloProcesso: it.tituloProcesso,
          tipoRecurso: it.tipoRecurso,
          partes: it.partes,
          relator: it.relator,
          advogadoResp: it.advogadoResp,
          situacao: it.situacao,
          prognostico: it.prognostico,
          observacoes: it.observacoes,
          providencia: it.providencia,
          sustentacaoOral: it.sustentacaoOral,
          advogadoSustentacao: it.advogadoSustentacao,
          sessaoVirtual: it.sessaoVirtual,
          pedidoRetPresencial: it.pedidoRetPresencial,
          retiradoDePauta: false,
          pedidoVistas: false,
          desPedidoVistas: null,
          parecerMpf: it.parecerMpf,
          processoId: it.processoId,
          ordem: it.ordem,
        })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json(nova, { status: 201 });
}
