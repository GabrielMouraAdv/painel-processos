import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { itemPautaInputSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = itemPautaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const sessao = await prisma.sessaoPauta.findFirst({
    where: { id: data.sessaoId, escritorioId },
    select: { id: true },
  });
  if (!sessao) {
    return NextResponse.json(
      { error: "Sessao nao encontrada" },
      { status: 400 },
    );
  }

  if (data.processoTceId) {
    const proc = await prisma.processoTce.findFirst({
      where: { id: data.processoTceId, escritorioId },
      select: { id: true },
    });
    if (!proc) {
      return NextResponse.json(
        { error: "Processo TCE nao encontrado" },
        { status: 400 },
      );
    }
  }

  const ordem =
    data.ordem ??
    (await prisma.itemPauta.count({ where: { sessaoId: data.sessaoId } }));

  const item = await prisma.itemPauta.create({
    data: {
      sessaoId: data.sessaoId,
      numeroProcesso: data.numeroProcesso,
      tituloProcesso: data.tituloProcesso || null,
      municipio: data.municipio,
      exercicio: data.exercicio || null,
      relator: data.relator,
      advogadoResp: data.advogadoResp,
      situacao: data.situacao || null,
      observacoes: data.observacoes || null,
      prognostico: data.prognostico || null,
      providencia: data.providencia || null,
      retiradoDePauta: data.retiradoDePauta ?? false,
      pedidoVistas: data.pedidoVistas ?? false,
      conselheiroVistas: data.conselheiroVistas || null,
      processoTceId: data.processoTceId || null,
      ordem,
    },
    select: { id: true },
  });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.CRIAR_ITEM_PAUTA,
    entidade: "ItemPauta",
    entidadeId: item.id,
    descricao: `${session.user.name ?? "Usuario"} adicionou item ${data.numeroProcesso} a pauta TCE`,
    ip: extrairIp(req),
  });
  return NextResponse.json(item, { status: 201 });
}
