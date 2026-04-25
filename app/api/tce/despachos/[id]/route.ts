import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  prognosticoDespacho: z.string().nullish(),
  retornoDespacho: z.string().nullish(),
  despachadoComRelator: z.boolean().optional(),
  incluidoNoDespacho: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const existing = await prisma.processoTce.findFirst({
    where: { id: params.id, escritorioId },
    select: { id: true, despachadoComRelator: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const update: {
    prognosticoDespacho?: string | null;
    retornoDespacho?: string | null;
    despachadoComRelator?: boolean;
    incluidoNoDespacho?: boolean;
    dataDespacho?: Date | null;
  } = {};

  if (data.prognosticoDespacho !== undefined) {
    update.prognosticoDespacho =
      data.prognosticoDespacho?.trim() || null;
  }
  if (data.retornoDespacho !== undefined) {
    update.retornoDespacho = data.retornoDespacho?.trim() || null;
  }
  if (data.despachadoComRelator !== undefined) {
    update.despachadoComRelator = data.despachadoComRelator;
    if (data.despachadoComRelator && !existing.despachadoComRelator) {
      update.dataDespacho = new Date();
    }
    if (!data.despachadoComRelator) {
      update.dataDespacho = null;
    }
  }
  if (data.incluidoNoDespacho !== undefined) {
    update.incluidoNoDespacho = data.incluidoNoDespacho;
  }

  await prisma.processoTce.update({
    where: { id: params.id },
    data: update,
  });

  return NextResponse.json({ ok: true });
}
