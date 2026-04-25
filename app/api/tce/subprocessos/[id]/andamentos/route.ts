import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  data: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v))),
  fase: z.string().min(1, "Selecione a fase"),
  descricao: z.string().min(1, "Descreva o andamento"),
  atualizarFase: z.boolean().optional().default(true),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;
  const userId = session.user.id;

  const sub = await prisma.subprocessoTce.findFirst({
    where: { id: params.id, processoPai: { escritorioId } },
    select: { id: true },
  });
  if (!sub) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.andamentoSubprocessoTce.create({
      data: {
        subprocessoId: sub.id,
        data: data.data,
        fase: data.fase,
        descricao: data.descricao,
        autorId: userId,
      },
    });
    if (data.atualizarFase) {
      await tx.subprocessoTce.update({
        where: { id: sub.id },
        data: { fase: data.fase },
      });
    }
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
