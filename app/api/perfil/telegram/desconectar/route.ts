import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { tryDecrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { telegramDeleteWebhook } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      telegramBotToken: true,
      telegramBotUsername: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
  }

  const token = tryDecrypt(user.telegramBotToken);
  if (token) {
    // Best-effort: remove webhook do bot. Mesmo se falhar, limpamos do banco.
    await telegramDeleteWebhook(token).catch(() => null);
  }

  await prisma.user.update({
    where: { id: session.user.id },
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
    entidadeId: session.user.id,
    descricao: `${session.user.name ?? "Usuario"} desconectou o bot${
      user.telegramBotUsername ? ` @${user.telegramBotUsername}` : ""
    }`,
    ip: extrairIp(req),
  });

  return NextResponse.json({ ok: true });
}
