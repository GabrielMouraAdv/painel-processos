import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  tipo: z.enum(["movimentacao", "publicacao"]),
  id: z.string().min(1).optional(),
  todas: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { tipo, id, todas } = parsed.data;

  if (todas) {
    if (tipo === "movimentacao") {
      const r = await prisma.movimentacaoAutomatica.updateMany({
        where: { lida: false, processo: { escritorioId } },
        data: { lida: true },
      });
      return NextResponse.json({ atualizadas: r.count });
    }
    const r = await prisma.publicacaoDJEN.updateMany({
      where: { lida: false, processo: { escritorioId } },
      data: { lida: true },
    });
    return NextResponse.json({ atualizadas: r.count });
  }

  if (!id) {
    return NextResponse.json({ error: "id obrigatorio" }, { status: 400 });
  }

  if (tipo === "movimentacao") {
    const item = await prisma.movimentacaoAutomatica.findFirst({
      where: { id, processo: { escritorioId } },
      select: { id: true },
    });
    if (!item) {
      return NextResponse.json(
        { error: "Movimentacao nao encontrada" },
        { status: 404 },
      );
    }
    await prisma.movimentacaoAutomatica.update({
      where: { id: item.id },
      data: { lida: true },
    });
  } else {
    const item = await prisma.publicacaoDJEN.findFirst({
      where: { id, processo: { escritorioId } },
      select: { id: true },
    });
    if (!item) {
      return NextResponse.json(
        { error: "Publicacao nao encontrada" },
        { status: 404 },
      );
    }
    await prisma.publicacaoDJEN.update({
      where: { id: item.id },
      data: { lida: true },
    });
  }

  return NextResponse.json({ ok: true });
}
