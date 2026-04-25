import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.subprocessoTce.findFirst({
    where: { id, processoPai: { escritorioId } },
    select: { id: true },
  });
}

const patchSchema = z.object({
  fase: z.string().min(1).optional(),
  relator: z.string().nullish(),
  decisao: z.string().nullish(),
  observacoes: z.string().nullish(),
  dataIntimacao: z
    .union([z.string(), z.date(), z.null()])
    .nullish()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      return v instanceof Date ? v : new Date(v);
    }),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const owned = await ensureOwned(params.id, session.user.escritorioId);
  if (!owned)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  await prisma.subprocessoTce.update({
    where: { id: params.id },
    data: {
      ...(data.fase !== undefined && { fase: data.fase }),
      ...(data.relator !== undefined && {
        relator: data.relator?.trim() || null,
      }),
      ...(data.decisao !== undefined && {
        decisao: data.decisao?.trim() || null,
      }),
      ...(data.observacoes !== undefined && {
        observacoes: data.observacoes?.trim() || null,
      }),
      ...(data.dataIntimacao !== undefined && {
        dataIntimacao: data.dataIntimacao,
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
  const owned = await ensureOwned(params.id, session.user.escritorioId);
  if (!owned)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  await prisma.subprocessoTce.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
