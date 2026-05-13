import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { enviarMensagemTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const nome = session.user.name ?? "Usuario";
  const res = await enviarMensagemTelegram(
    session.user.id,
    `✅ <b>Teste OK</b>\n\nOla, ${nome}! Recebendo essa mensagem significa que sua secretaria pessoal esta funcionando.`,
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: res.error ?? "Erro ao enviar mensagem" },
      { status: 400 },
    );
  }
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.TESTAR_TELEGRAM,
    entidade: "User",
    entidadeId: session.user.id,
    descricao: `${nome} enviou mensagem de teste para o bot`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
