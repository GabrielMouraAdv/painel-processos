import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prazoTceUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.prazoTce.findFirst({
    where: { id, processo: { escritorioId } },
    select: { id: true },
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
  const parsed = prazoTceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  await prisma.prazoTce.update({
    where: { id: params.id },
    data: {
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.dataIntimacao !== undefined && {
        dataIntimacao: data.dataIntimacao,
      }),
      ...(data.dataVencimento !== undefined && {
        dataVencimento: data.dataVencimento,
      }),
      ...(data.diasUteis !== undefined && { diasUteis: data.diasUteis }),
      ...(data.prorrogavel !== undefined && { prorrogavel: data.prorrogavel }),
      ...(data.prorrogacaoPedida !== undefined && {
        prorrogacaoPedida: data.prorrogacaoPedida,
      }),
      ...(data.dataProrrogacao !== undefined && {
        dataProrrogacao: data.dataProrrogacao,
      }),
      ...(data.cumprido !== undefined && { cumprido: data.cumprido }),
      ...(data.advogadoRespId !== undefined && {
        advogadoRespId: data.advogadoRespId || null,
      }),
      ...(data.observacoes !== undefined && {
        observacoes: data.observacoes || null,
      }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await prisma.prazoTce.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
