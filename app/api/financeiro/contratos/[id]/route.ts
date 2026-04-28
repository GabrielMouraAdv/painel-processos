import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { contratoMunicipalUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.contratoMunicipal.findFirst({
    where: { id, municipio: { escritorioId } },
    select: { id: true },
  });
}

export async function GET(
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
    const c = await prisma.contratoMunicipal.findFirst({
      where: {
        id: params.id,
        municipio: { escritorioId: session.user.escritorioId },
      },
      include: {
        municipio: { select: { id: true, nome: true, uf: true } },
        notas: { orderBy: [{ anoReferencia: "asc" }, { mesReferencia: "asc" }] },
      },
    });
    if (!c) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }
    return NextResponse.json({ contrato: c });
  } catch (err) {
    console.error("[GET /api/financeiro/contratos/[id]] erro:", err);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 },
    );
  }
}

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
    const exists = await ensureOwned(params.id, session.user.escritorioId);
    if (!exists) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body invalido" }, { status: 400 });
    }
    const parsed = contratoMunicipalUpdateSchema.safeParse(body);
    if (!parsed.success) {
      console.warn("[PATCH contratos/[id]] validacao:", parsed.error.flatten());
      return NextResponse.json(
        { error: "Dados invalidos", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;
    await prisma.contratoMunicipal.update({
      where: { id: params.id },
      data: {
        ...(data.municipioId !== undefined && { municipioId: data.municipioId }),
        ...(data.bancasSlug !== undefined && { bancasSlug: data.bancasSlug }),
        ...(data.valorMensal !== undefined && {
          valorMensal: data.valorMensal.toFixed(2),
        }),
        ...(data.dataInicio !== undefined && { dataInicio: data.dataInicio }),
        ...(data.dataFim !== undefined && { dataFim: data.dataFim }),
        ...(data.ativo !== undefined && { ativo: data.ativo }),
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/financeiro/contratos/[id]] erro:", err);
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
    const exists = await ensureOwned(params.id, session.user.escritorioId);
    if (!exists) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }
    await prisma.contratoMunicipal.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/financeiro/contratos/[id]] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
