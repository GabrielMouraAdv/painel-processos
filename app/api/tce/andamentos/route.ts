import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { andamentoTceInputSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = andamentoTceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const processo = await prisma.processoTce.findFirst({
    where: { id: data.processoId, escritorioId },
    select: { id: true },
  });
  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 400 },
    );
  }

  const andamento = await prisma.andamentoTce.create({
    data: {
      processoId: data.processoId,
      data: data.data,
      fase: data.fase,
      descricao: data.descricao,
      autorId: userId,
    },
    select: { id: true },
  });

  if (data.atualizarFaseProcesso !== false) {
    await prisma.processoTce.update({
      where: { id: data.processoId },
      data: { faseAtual: data.fase },
    });
  }

  return NextResponse.json(andamento, { status: 201 });
}
