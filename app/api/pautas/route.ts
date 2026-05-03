import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
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
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.CRIAR_SESSAO_PAUTA,
    entidade: "SessaoJudicial",
    entidadeId: sessao.id,
    descricao: `${session.user.name ?? "Usuario"} criou sessao de pauta judicial ${data.tribunal} - ${data.orgaoJulgador} em ${new Date(data.data).toLocaleDateString("pt-BR")}`,
    ip: extrairIp(req),
  });
  return NextResponse.json(sessao, { status: 201 });
}
