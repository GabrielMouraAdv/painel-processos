import { NextResponse } from "next/server";

import {
  gerarAgendaAmanha,
  gerarAgendaHoje,
  gerarAgendaSemana,
  gerarListaProcessos,
  gerarPrazosVencendo,
  gerarStatusGeral,
  mensagemAjuda,
  mensagemBoasVindas,
} from "@/lib/agenda";
import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { tryDecrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  telegramSendMessage,
  type TelegramUpdate,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function comandoDe(texto: string): string {
  const c = texto.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const limpo = c.replace(/@.+$/, "");
  return limpo;
}

export async function POST(
  req: Request,
  { params }: { params: { userId: string } },
) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  const headerSecret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!expectedSecret || headerSecret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const userId = params.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nome: true,
      telegramAtivo: true,
      telegramBotToken: true,
      telegramChatId: true,
    },
  });

  // Sempre responder 200 ao Telegram para nao gerar reentries em caso de erro
  // logico de nosso lado. Validamos internamente.
  if (
    !user ||
    !user.telegramAtivo ||
    !user.telegramBotToken ||
    !user.telegramChatId
  ) {
    return NextResponse.json({ ok: true });
  }

  const token = tryDecrypt(user.telegramBotToken);
  if (!token) return NextResponse.json({ ok: true });

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const msg = update?.message ?? update?.edited_message;
  if (!msg || !msg.text) return NextResponse.json({ ok: true });

  // Bloqueia chats nao autorizados: o bot so atende ao chat_id cadastrado.
  if (String(msg.chat.id) !== user.telegramChatId) {
    await telegramSendMessage(
      token,
      String(msg.chat.id),
      "Este bot e pessoal e nao atende a outras pessoas.",
    );
    return NextResponse.json({ ok: true });
  }

  const cmd = comandoDe(msg.text);

  let resposta = "";
  let comandoConhecido = true;
  try {
    switch (cmd) {
      case "/start":
        resposta = mensagemBoasVindas(user.nome);
        break;
      case "/help":
      case "/ajuda":
        resposta = mensagemAjuda();
        break;
      case "/agenda":
      case "/hoje":
        resposta = await gerarAgendaHoje(user.id);
        break;
      case "/amanha":
      case "/amanhã":
        resposta = await gerarAgendaAmanha(user.id);
        break;
      case "/semana":
        resposta = await gerarAgendaSemana(user.id);
        break;
      case "/vencendo":
      case "/prazos":
        resposta = await gerarPrazosVencendo(user.id, 7);
        break;
      case "/processos":
        resposta = await gerarListaProcessos(user.id);
        break;
      case "/status":
        resposta = await gerarStatusGeral(user.id);
        break;
      default:
        comandoConhecido = false;
        resposta =
          "Comando nao reconhecido. Envie /ajuda para ver os comandos disponiveis.\n\n<i>(Em breve voce podera usar linguagem natural!)</i>";
    }
  } catch (err) {
    console.error("[telegram webhook] erro processando", cmd, err);
    resposta =
      "Ops, ocorreu um erro ao processar seu comando. Tente novamente em alguns segundos.";
  }

  await telegramSendMessage(token, user.telegramChatId, resposta);

  await registrarLog({
    userId: user.id,
    acao: ACOES.COMANDO_TELEGRAM,
    entidade: "User",
    entidadeId: user.id,
    descricao: `${user.nome} enviou comando ${comandoConhecido ? cmd : "(desconhecido)"} via Telegram`,
    detalhes: { comando: comandoConhecido ? cmd : null },
    ip: extrairIp(req),
  });

  return NextResponse.json({ ok: true });
}
