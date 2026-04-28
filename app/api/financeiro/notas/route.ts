import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { notaFiscalInputSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  try {
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
  } catch (err) {
    console.error("[GET /api/financeiro/notas] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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
    if (!body) {
      return NextResponse.json({ error: "Body invalido" }, { status: 400 });
    }
    const parsed = notaFiscalInputSchema.safeParse(body);
    if (!parsed.success) {
      console.warn("[POST notas] validacao:", parsed.error.flatten());
      const issues = parsed.error.flatten();
      const primeiroErro =
        Object.values(issues.fieldErrors).flat()[0] ??
        issues.formErrors[0] ??
        "Dados invalidos";
      return NextResponse.json(
        { error: primeiroErro, issues },
        { status: 400 },
      );
    }
    const data = parsed.data;
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
        valorNota: data.valorNota.toFixed(2),
        dataVencimento: data.dataVencimento,
        pago: data.pago ?? false,
        dataPagamento: data.dataPagamento ?? null,
        valorPago: data.valorPago !== null && data.valorPago !== undefined
          ? data.valorPago.toFixed(2)
          : null,
        observacoes: data.observacoes ?? null,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: nota.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/financeiro/notas] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
