import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { tryDecrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { telegramDeleteWebhook } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// Admin force-disconnects o bot do Telegram de qualquer usuario do mesmo
// escritorio. Util quando o token vazou ou o usuario foi desligado.
export async function POST(
  req: Request,
  { params }: { params: { userId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  const alvo = await prisma.user.findFirst({
    where: {
      id: params.userId,
      escritorioId: session.user.escritorioId,
    },
    select: {
      id: true,
      nome: true,
      telegramBotToken: true,
      telegramBotUsername: true,
    },
  });
  if (!alvo) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  const token = tryDecrypt(alvo.telegramBotToken);
  if (token) {
    await telegramDeleteWebhook(token).catch(() => null);
  }
  await prisma.user.update({
    where: { id: alvo.id },
    data: {
      telegramBotToken: null,
      telegramBotUsername: null,
      telegramChatId: null,
      telegramAtivo: false,
    },
  });

  await registrarLog({
    userId: session.user.id,
    acao: ACOES.DESCONECTAR_TELEGRAM,
    entidade: "User",
    entidadeId: alvo.id,
    descricao: `${session.user.name ?? "Admin"} forcou desconexao do bot de ${alvo.nome}`,
    ip: extrairIp(req),
  });

  return NextResponse.json({ ok: true });
}
