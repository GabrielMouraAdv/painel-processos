import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  mensagemBoasVindas,
  mensagemAjuda,
} from "@/lib/agenda";
import {
  telegramGetMe,
  telegramGetUpdates,
  telegramSendMessage,
  telegramSetWebhook,
  webhookUrlPara,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as {
    token?: string;
  } | null;
  const token = body?.token?.trim();
  if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
    return NextResponse.json(
      { error: "Token invalido. Formato esperado: 1234567890:ABCDEFGH..." },
      { status: 400 },
    );
  }

  const me = await telegramGetMe(token);
  if (!me.ok || !me.result?.is_bot) {
    return NextResponse.json(
      {
        error:
          "Nao consegui validar o bot. Verifique o token com @BotFather e tente novamente.",
        details: me.description,
      },
      { status: 400 },
    );
  }

  // Pega o ultimo update do bot para descobrir o chat_id do usuario.
  const updates = await telegramGetUpdates(token);
  if (!updates.ok) {
    return NextResponse.json(
      {
        error: "Erro ao consultar Telegram",
        details: updates.description,
      },
      { status: 502 },
    );
  }
  const lista = updates.result ?? [];
  // Procura a mensagem mais recente vinda de um humano (nao bot).
  let chatId: string | null = null;
  for (let i = lista.length - 1; i >= 0; i--) {
    const msg = lista[i].message ?? lista[i].edited_message;
    if (msg && msg.from && msg.from.is_bot === false) {
      chatId = String(msg.chat.id);
      break;
    }
  }
  if (!chatId) {
    return NextResponse.json(
      {
        error:
          "Nao encontrei mensagens no bot. Abra o bot no Telegram, envie /start e tente conectar de novo.",
      },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "TELEGRAM_WEBHOOK_SECRET nao configurada no servidor" },
      { status: 500 },
    );
  }

  const webhookUrl = webhookUrlPara(session.user.id);
  if (!webhookUrl.startsWith("http")) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL nao configurada corretamente" },
      { status: 500 },
    );
  }

  const setWh = await telegramSetWebhook(token, webhookUrl, webhookSecret);
  if (!setWh.ok) {
    return NextResponse.json(
      {
        error: "Erro ao configurar webhook no Telegram",
        details: setWh.description,
      },
      { status: 502 },
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      telegramBotToken: encrypt(token),
      telegramBotUsername: me.result.username ?? null,
      telegramChatId: chatId,
      telegramAtivo: true,
    },
  });

  // Manda mensagem de boas-vindas pelo bot.
  const nome = session.user.name ?? "Usuario";
  await telegramSendMessage(
    token,
    chatId,
    `${mensagemBoasVindas(nome)}\n\n${mensagemAjuda()}`,
  );

  await registrarLog({
    userId: session.user.id,
    acao: ACOES.CONECTAR_TELEGRAM,
    entidade: "User",
    entidadeId: session.user.id,
    descricao: `${nome} conectou o bot @${me.result.username ?? "?"} ao painel`,
    detalhes: { botUsername: me.result.username, botId: me.result.id },
    ip: extrairIp(req),
  });

  return NextResponse.json({
    ok: true,
    botUsername: me.result.username,
    chatId,
  });
}
