import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sessaoPautaInputSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = sessaoPautaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const sessao = await prisma.sessaoPauta.create({
    data: {
      data: data.data,
      camara: data.camara,
      observacoesGerais: data.observacoesGerais || null,
      escritorioId,
    },
    select: { id: true },
  });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.CRIAR_SESSAO_PAUTA,
    entidade: "SessaoPauta",
    entidadeId: sessao.id,
    descricao: `${session.user.name ?? "Usuario"} criou sessao de pauta TCE ${data.camara} em ${new Date(data.data).toLocaleDateString("pt-BR")}`,
    ip: extrairIp(req),
  });
  return NextResponse.json(sessao, { status: 201 });
}
