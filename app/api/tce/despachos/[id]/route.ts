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

  // Tenta ProcessoTce primeiro
  const processo = await prisma.processoTce.findFirst({
    where: { id: params.id, escritorioId },
    select: { id: true, despachadoComRelator: true },
  });

  // Se nao for processo, tenta SubprocessoTce
  let subprocesso: { id: string; despachadoComRelator: boolean } | null = null;
  if (!processo) {
    subprocesso = await prisma.subprocessoTce.findFirst({
      where: { id: params.id, processoPai: { escritorioId } },
      select: { id: true, despachadoComRelator: true },
    });
  }

  if (!processo && !subprocesso) {
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

  const ehProcesso = !!processo;
  const atual = (processo ?? subprocesso)!;

  if (data.prognosticoDespacho !== undefined) {
    update.prognosticoDespacho = data.prognosticoDespacho?.trim() || null;
  }
  if (data.retornoDespacho !== undefined) {
    update.retornoDespacho = data.retornoDespacho?.trim() || null;
  }
  if (data.despachadoComRelator !== undefined) {
    update.despachadoComRelator = data.despachadoComRelator;
    if (data.despachadoComRelator && !atual.despachadoComRelator) {
      update.dataDespacho = new Date();
    }
    if (!data.despachadoComRelator) {
      update.dataDespacho = null;
    }
  }
  // Subprocessos nao tem incluidoNoDespacho — ignoramos silenciosamente
  if (ehProcesso && data.incluidoNoDespacho !== undefined) {
    update.incluidoNoDespacho = data.incluidoNoDespacho;
  }

  if (ehProcesso) {
    await prisma.processoTce.update({
      where: { id: params.id },
      data: update,
    });
  } else {
    // omit incluidoNoDespacho que nao existe no subprocesso
    const subUpdate = { ...update };
    delete subUpdate.incluidoNoDespacho;
    await prisma.subprocessoTce.update({
      where: { id: params.id },
      data: subUpdate,
    });
  }

  return NextResponse.json({ ok: true });
}
