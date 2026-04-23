import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { podeEditarPauta } from "@/lib/pauta-permissions";
import { prisma } from "@/lib/prisma";
import { sessaoJudicialUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.sessaoJudicial.findFirst({
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
  if (!podeEditarPauta(session.user.role)) {
    return NextResponse.json(
      { error: "Sem permissao para editar sessao" },
      { status: 403 },
    );
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = sessaoJudicialUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  await prisma.sessaoJudicial.update({
    where: { id: params.id },
    data: {
      ...(data.data !== undefined && { data: data.data }),
      ...(data.tribunal !== undefined && { tribunal: data.tribunal }),
      ...(data.orgaoJulgador !== undefined && {
        orgaoJulgador: data.orgaoJulgador,
      }),
      ...(data.tipoSessao !== undefined && { tipoSessao: data.tipoSessao }),
      ...(data.observacoesGerais !== undefined && {
        observacoesGerais: data.observacoesGerais || null,
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
  if (!podeEditarPauta(session.user.role)) {
    return NextResponse.json(
      { error: "Sem permissao para excluir sessao" },
      { status: 403 },
    );
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await prisma.sessaoJudicial.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
