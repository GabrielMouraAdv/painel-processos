import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { notaFiscalInputSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (
    !podeAcessarFinanceiro(session.user.role, session.user.bancaSlug ?? null)
  ) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  const url = new URL(req.url);
  const contratoId = url.searchParams.get("contratoId");
  const ano = url.searchParams.get("ano");

  const notas = await prisma.notaFiscal.findMany({
    where: {
      contrato: { municipio: { escritorioId: session.user.escritorioId } },
      ...(contratoId && { contratoId }),
      ...(ano && { anoReferencia: parseInt(ano, 10) }),
    },
    orderBy: [{ anoReferencia: "asc" }, { mesReferencia: "asc" }],
  });
  return NextResponse.json({ notas });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (
    !podeAcessarFinanceiro(session.user.role, session.user.bancaSlug ?? null)
  ) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = notaFiscalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  // Verifica ownership do contrato
  const contrato = await prisma.contratoMunicipal.findFirst({
    where: {
      id: data.contratoId,
      municipio: { escritorioId: session.user.escritorioId },
    },
    select: { id: true },
  });
  if (!contrato) {
    return NextResponse.json(
      { error: "Contrato nao encontrado" },
      { status: 400 },
    );
  }

  const nota = await prisma.notaFiscal.create({
    data: {
      contratoId: data.contratoId,
      numeroNota: data.numeroNota ?? null,
      dataEmissao: data.dataEmissao ?? null,
      mesReferencia: data.mesReferencia,
      anoReferencia: data.anoReferencia,
      valorNota: data.valorNota,
      dataVencimento: data.dataVencimento,
      pago: data.pago ?? false,
      dataPagamento: data.dataPagamento ?? null,
      valorPago: data.valorPago ?? null,
      observacoes: data.observacoes ?? null,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: nota.id }, { status: 201 });
}
