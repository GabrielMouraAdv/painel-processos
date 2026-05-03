import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { podeEditarPauta } from "@/lib/pauta-permissions";
import { prisma } from "@/lib/prisma";
import { itemPautaJudicialInputSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (!podeEditarPauta(session.user.role)) {
    return NextResponse.json(
      { error: "Sem permissao para criar item" },
      { status: 403 },
    );
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = itemPautaJudicialInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const sessao = await prisma.sessaoJudicial.findFirst({
    where: { id: data.sessaoId, escritorioId },
    select: { id: true },
  });
  if (!sessao) {
    return NextResponse.json(
      { error: "Sessao nao encontrada" },
      { status: 400 },
    );
  }

  if (data.processoId) {
    const proc = await prisma.processo.findFirst({
      where: { id: data.processoId, escritorioId },
      select: { id: true },
    });
    if (!proc) {
      return NextResponse.json(
        { error: "Processo nao encontrado" },
        { status: 400 },
      );
    }
  }

  const ordem =
    data.ordem ??
    (await prisma.itemPautaJudicial.count({
      where: { sessaoId: data.sessaoId },
    }));

  const item = await prisma.itemPautaJudicial.create({
    data: {
      sessaoId: data.sessaoId,
      numeroProcesso: data.numeroProcesso,
      tituloProcesso: data.tituloProcesso || null,
      tipoRecurso: data.tipoRecurso || null,
      partes: data.partes || null,
      relator: data.relator,
      advogadoResp: data.advogadoResp,
      situacao: data.situacao || null,
      prognostico: data.prognostico || null,
      observacoes: data.observacoes || null,
      providencia: data.providencia || null,
      sustentacaoOral: data.sustentacaoOral ?? false,
      advogadoSustentacao: data.advogadoSustentacao || null,
      sessaoVirtual: data.sessaoVirtual ?? false,
      pedidoRetPresencial: data.pedidoRetPresencial ?? false,
      retiradoDePauta: data.retiradoDePauta ?? false,
      pedidoVistas: data.pedidoVistas ?? false,
      desPedidoVistas: data.desPedidoVistas || null,
      parecerMpf: data.parecerMpf ?? false,
      processoId: data.processoId || null,
      ordem,
    },
    select: { id: true },
  });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.CRIAR_ITEM_PAUTA,
    entidade: "ItemPautaJudicial",
    entidadeId: item.id,
    descricao: `${session.user.name ?? "Usuario"} adicionou item ${data.numeroProcesso} a pauta judicial`,
    ip: extrairIp(req),
  });
  return NextResponse.json(item, { status: 201 });
}
