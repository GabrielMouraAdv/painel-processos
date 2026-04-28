import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { honorarioPessoalUpdateSchema } from "@/lib/schemas";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
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
    const exists = await prisma.honorarioPessoal.findFirst({
      where: { id: params.id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body invalido" }, { status: 400 });
    }
    const parsed = honorarioPessoalUpdateSchema.safeParse(body);
    if (!parsed.success) {
      console.warn(
        "[PATCH honorarios-pessoais/[id]] validacao:",
        parsed.error.flatten(),
      );
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
    await prisma.honorarioPessoal.update({
      where: { id: params.id },
      data: {
        ...(data.clienteNome !== undefined && { clienteNome: data.clienteNome }),
        ...(data.clienteCpf !== undefined && { clienteCpf: data.clienteCpf }),
        ...(data.bancasSlug !== undefined && { bancasSlug: data.bancasSlug }),
        ...(data.tipoHonorario !== undefined && {
          tipoHonorario: data.tipoHonorario,
        }),
        ...(data.descricaoCausa !== undefined && {
          descricaoCausa: data.descricaoCausa,
        }),
        ...(data.valorTotal !== undefined && {
          valorTotal: data.valorTotal.toFixed(2),
        }),
        ...(data.dataContrato !== undefined && {
          dataContrato: data.dataContrato,
        }),
        ...(data.dataVencimento !== undefined && {
          dataVencimento: data.dataVencimento,
        }),
        ...(data.pago !== undefined && { pago: data.pago }),
        ...(data.dataPagamento !== undefined && {
          dataPagamento: data.dataPagamento,
        }),
        ...(data.valorPago !== undefined && {
          valorPago:
            data.valorPago !== null ? data.valorPago.toFixed(2) : null,
        }),
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      "[PATCH /api/financeiro/honorarios-pessoais/[id]] erro:",
      err,
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
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
    const exists = await prisma.honorarioPessoal.findFirst({
      where: { id: params.id },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }
    await prisma.honorarioPessoal.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      "[DELETE /api/financeiro/honorarios-pessoais/[id]] erro:",
      err,
    );
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
