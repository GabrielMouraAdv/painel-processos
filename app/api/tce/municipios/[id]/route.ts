import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { municipioInputSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.municipio.findFirst({
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
  const parsed = municipioInputSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  await prisma.municipio.update({
    where: { id: params.id },
    data: {
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.uf !== undefined && { uf: data.uf.toUpperCase() }),
      ...(data.cnpjPrefeitura !== undefined && {
        cnpjPrefeitura: data.cnpjPrefeitura || null,
      }),
      ...(data.observacoes !== undefined && {
        observacoes: data.observacoes || null,
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

  const [tceCount, gestoesCount] = await Promise.all([
    prisma.processoTce.count({ where: { municipioId: params.id } }),
    prisma.historicoGestao.count({ where: { municipioId: params.id } }),
  ]);
  if (tceCount > 0 || gestoesCount > 0) {
    const partes: string[] = [];
    if (tceCount > 0)
      partes.push(`${tceCount} processo${tceCount === 1 ? "" : "s"} TCE`);
    if (gestoesCount > 0)
      partes.push(
        `${gestoesCount} gesta${gestoesCount === 1 ? "o" : "es"} historica${gestoesCount === 1 ? "" : "s"}`,
      );
    return NextResponse.json(
      {
        error: `Nao e possivel excluir: existem ${partes.join(" e ")} vinculado${tceCount + gestoesCount === 1 ? "" : "s"}. Remova ou transfira antes.`,
        processosTce: tceCount,
        gestoes: gestoesCount,
      },
      { status: 409 },
    );
  }

  await prisma.municipio.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
