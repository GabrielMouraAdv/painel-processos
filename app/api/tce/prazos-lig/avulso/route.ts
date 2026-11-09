import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Conclui (tira da lista e da exportacao) um agendamento avulso da aba
// "Agendamento de publicacoes"; DELETE com o id desfaz a conclusao.
const schema = z.object({ id: z.string().min(1) });

async function alterar(req: Request, concluir: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const a = await prisma.agendamentoAvulsoLig.findUnique({ where: { id: parsed.data.id } });
  if (!a) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  const nome = session.user.name ?? session.user.email ?? "usuário";
  await prisma.agendamentoAvulsoLig.update({
    where: { id: a.id },
    data: concluir ? { concluidoEm: new Date(), concluidoPor: nome } : { concluidoEm: null, concluidoPor: null },
  });
  await registrarLog({
    userId: session.user.id,
    acao: "AGENDAMENTO_AVULSO",
    entidade: "AgendamentoAvulsoLig",
    entidadeId: a.id,
    descricao: `${concluir ? "Concluiu" : "Reabriu"} o agendamento avulso ${a.peca} · ${a.numeroProcesso}`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  return alterar(req, true);
}

export async function DELETE(req: Request) {
  return alterar(req, false);
}
