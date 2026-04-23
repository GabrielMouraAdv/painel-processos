import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gestorInputSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.gestor.findFirst({
    where: { id, escritorioId },
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
  const escritorioId = session.user.escritorioId;

  const existing = await ensureOwned(params.id, escritorioId);
  if (!existing) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = gestorInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    await prisma.gestor.update({
      where: { id: params.id },
      data: {
        nome: data.nome,
        cpf: data.cpf,
        municipio: data.municipio,
        cargo: data.cargo,
        observacoes: data.observacoes ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    if (msg.includes("Unique")) {
      return NextResponse.json(
        { error: "Ja existe um gestor com esse CPF" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao atualizar gestor" }, { status: 500 });
  }
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

  const count = await prisma.processo.count({ where: { gestorId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Gestor possui ${count} processo(s) vinculado(s). Remova-os antes.` },
      { status: 409 },
    );
  }

  await prisma.gestor.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
