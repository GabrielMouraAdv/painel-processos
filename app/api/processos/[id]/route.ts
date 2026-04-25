import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processoInputSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.processo.findFirst({
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
  const parsed = processoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const [gestor, advogado] = await Promise.all([
    prisma.gestor.findFirst({ where: { id: data.gestorId, escritorioId } }),
    prisma.user.findFirst({ where: { id: data.advogadoId, escritorioId } }),
  ]);
  if (!gestor) return NextResponse.json({ error: "Gestor nao encontrado" }, { status: 400 });
  if (!advogado) return NextResponse.json({ error: "Advogado nao encontrado" }, { status: 400 });

  try {
    await prisma.processo.update({
      where: { id: params.id },
      data: {
        numero: data.numero,
        tipo: data.tipo,
        tipoLivre: data.tipo === "OUTRO" ? (data.tipoLivre ?? null) : null,
        tribunal: data.tribunal,
        juizo: data.juizo,
        grau: data.grau,
        fase: data.fase,
        resultado: data.resultado ?? null,
        risco: data.risco,
        valor: data.valor ?? null,
        dataDistribuicao: data.dataDistribuicao,
        objeto: data.objeto,
        gestorId: data.gestorId,
        advogadoId: data.advogadoId,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    if (msg.includes("Unique")) {
      return NextResponse.json(
        { error: "Ja existe um processo com esse numero" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao atualizar processo" }, { status: 500 });
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
  const escritorioId = session.user.escritorioId;

  const existing = await ensureOwned(params.id, escritorioId);
  if (!existing) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await prisma.processo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
