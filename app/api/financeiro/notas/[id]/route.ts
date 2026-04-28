import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { notaFiscalUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.notaFiscal.findFirst({
    where: { id, contrato: { municipio: { escritorioId } } },
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
  if (
    !podeAcessarFinanceiro(session.user.role, session.user.bancaSlug ?? null)
  ) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  const exists = await ensureOwned(params.id, session.user.escritorioId);
  if (!exists) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = notaFiscalUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  await prisma.notaFiscal.update({
    where: { id: params.id },
    data: {
      ...(data.numeroNota !== undefined && { numeroNota: data.numeroNota }),
      ...(data.dataEmissao !== undefined && { dataEmissao: data.dataEmissao }),
      ...(data.mesReferencia !== undefined && {
        mesReferencia: data.mesReferencia,
      }),
      ...(data.anoReferencia !== undefined && {
        anoReferencia: data.anoReferencia,
      }),
      ...(data.valorNota !== undefined && { valorNota: data.valorNota }),
      ...(data.dataVencimento !== undefined && {
        dataVencimento: data.dataVencimento,
      }),
      ...(data.pago !== undefined && { pago: data.pago }),
      ...(data.dataPagamento !== undefined && {
        dataPagamento: data.dataPagamento,
      }),
      ...(data.valorPago !== undefined && { valorPago: data.valorPago }),
      ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
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
  if (
    !podeAcessarFinanceiro(session.user.role, session.user.bancaSlug ?? null)
  ) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  const exists = await ensureOwned(params.id, session.user.escritorioId);
  if (!exists) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }
  await prisma.notaFiscal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
