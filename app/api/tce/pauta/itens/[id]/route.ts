import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { itemPautaUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.itemPauta.findFirst({
    where: { id, sessao: { escritorioId } },
    select: { id: true, numeroProcesso: true },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = itemPautaUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.processoTceId) {
    const proc = await prisma.processoTce.findFirst({
      where: { id: data.processoTceId, escritorioId: session.user.escritorioId },
      select: { id: true },
    });
    if (!proc) {
      return NextResponse.json(
        { error: "Processo TCE nao encontrado" },
        { status: 400 },
      );
    }
  }

  await prisma.itemPauta.update({
    where: { id: params.id },
    data: {
      ...(data.numeroProcesso !== undefined && {
        numeroProcesso: data.numeroProcesso,
      }),
      ...(data.tituloProcesso !== undefined && {
        tituloProcesso: data.tituloProcesso || null,
      }),
      ...(data.municipio !== undefined && { municipio: data.municipio }),
      ...(data.exercicio !== undefined && {
        exercicio: data.exercicio || null,
      }),
      ...(data.relator !== undefined && { relator: data.relator }),
      ...(data.advogadoResp !== undefined && {
        advogadoResp: data.advogadoResp,
      }),
      ...(data.situacao !== undefined && { situacao: data.situacao || null }),
      ...(data.observacoes !== undefined && {
        observacoes: data.observacoes || null,
      }),
      ...(data.prognostico !== undefined && {
        prognostico: data.prognostico || null,
      }),
      ...(data.providencia !== undefined && {
        providencia: data.providencia || null,
      }),
      ...(data.retiradoDePauta !== undefined && {
        retiradoDePauta: data.retiradoDePauta,
      }),
      ...(data.pedidoVistas !== undefined && {
        pedidoVistas: data.pedidoVistas,
      }),
      ...(data.conselheiroVistas !== undefined && {
        conselheiroVistas: data.conselheiroVistas || null,
      }),
      ...(data.processoTceId !== undefined && {
        processoTceId: data.processoTceId || null,
      }),
      ...(data.ordem !== undefined && { ordem: data.ordem }),
    },
  });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EDITAR_ITEM_PAUTA,
    entidade: "ItemPauta",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} editou item ${existing.numeroProcesso} da pauta TCE`,
    detalhes: data,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await prisma.itemPauta.delete({ where: { id: params.id } });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EXCLUIR_ITEM_PAUTA,
    entidade: "ItemPauta",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} excluiu item ${existing.numeroProcesso} da pauta TCE`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
