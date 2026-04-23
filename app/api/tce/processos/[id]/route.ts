import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processoTceUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.processoTce.findFirst({
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
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = processoTceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  await prisma.processoTce.update({
    where: { id: params.id },
    data: {
      ...(data.numero !== undefined && { numero: data.numero }),
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.municipioId !== undefined && {
        municipioId: data.municipioId || null,
      }),
      ...(data.relator !== undefined && { relator: data.relator || null }),
      ...(data.camara !== undefined && { camara: data.camara }),
      ...(data.faseAtual !== undefined && { faseAtual: data.faseAtual }),
      ...(data.conselheiroSubstituto !== undefined && {
        conselheiroSubstituto: data.conselheiroSubstituto || null,
      }),
      ...(data.notaTecnica !== undefined && { notaTecnica: data.notaTecnica }),
      ...(data.parecerMpco !== undefined && { parecerMpco: data.parecerMpco }),
      ...(data.despachadoComRelator !== undefined && {
        despachadoComRelator: data.despachadoComRelator,
      }),
      ...(data.memorialPronto !== undefined && {
        memorialPronto: data.memorialPronto,
      }),
      ...(data.exercicio !== undefined && {
        exercicio: data.exercicio || null,
      }),
      ...(data.valorAutuado !== undefined && {
        valorAutuado: data.valorAutuado,
      }),
      ...(data.objeto !== undefined && { objeto: data.objeto }),
      ...(data.dataAutuacao !== undefined && {
        dataAutuacao: data.dataAutuacao,
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
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await prisma.processoTce.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
