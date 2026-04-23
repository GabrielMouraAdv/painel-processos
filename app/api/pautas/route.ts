import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { podeEditarPauta } from "@/lib/pauta-permissions";
import { prisma } from "@/lib/prisma";
import { sessaoJudicialInputSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (!podeEditarPauta(session.user.role)) {
    return NextResponse.json(
      { error: "Sem permissao para criar sessao" },
      { status: 403 },
    );
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = sessaoJudicialInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const sessao = await prisma.sessaoJudicial.create({
    data: {
      data: data.data,
      tribunal: data.tribunal,
      orgaoJulgador: data.orgaoJulgador,
      tipoSessao: data.tipoSessao ?? "presencial",
      observacoesGerais: data.observacoesGerais || null,
      escritorioId,
    },
    select: { id: true },
  });
  return NextResponse.json(sessao, { status: 201 });
}
