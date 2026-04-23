import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prazoUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.prazo.findFirst({
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
  if (!existing) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = prazoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.advogadoRedatorId) {
    const redator = await prisma.user.findFirst({
      where: {
        id: data.advogadoRedatorId,
        escritorioId: session.user.escritorioId,
      },
      select: { id: true },
    });
    if (!redator) {
      return NextResponse.json(
        { error: "Advogado redator nao encontrado" },
        { status: 400 },
      );
    }
  }

  await prisma.prazo.update({
    where: { id: params.id },
    data: {
      ...(data.cumprido !== undefined && { cumprido: data.cumprido }),
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.data !== undefined && { data: data.data }),
      ...(data.hora !== undefined && { hora: data.hora || null }),
      ...(data.observacoes !== undefined && {
        observacoes: data.observacoes || null,
      }),
      ...(data.advogadoRedatorId !== undefined && {
        advogadoRedatorId: data.advogadoRedatorId || null,
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
  if (!existing) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await prisma.prazo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
