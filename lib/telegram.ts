import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

// Cliente minimal da Bot API. Cada usuario tem seu proprio bot, entao todas as
// chamadas recebem o token explicitamente (nao ha singleton global).

export const TELEGRAM_API = "https://api.telegram.org";

type TgRequest = {
  token: string;
  method: string;
  body?: Record<string, unknown>;
};

type TgResponse<T = unknown> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
};

async function tgFetch<T = unknown>({
  token,
  method,
  body,
}: TgRequest): Promise<TgResponse<T>> {
  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await res.json()) as TgResponse<T>;
  } catch (err) {
    return {
      ok: false,
      description: err instanceof Error ? err.message : String(err),
    };
  }
}

export type TelegramBotInfo = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

export async function telegramGetMe(token: string) {
  return tgFetch<TelegramBotInfo>({ token, method: "getMe" });
}

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

export type TelegramMessage = {
  message_id: number;
  date: number;
  text?: string;
  from?: {
    id: number;
    is_bot: boolean;
    first_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
    username?: string;
    first_name?: string;
  };
};

export async function telegramGetUpdates(token: string) {
  return tgFetch<TelegramUpdate[]>({ token, method: "getUpdates" });
}

export async function telegramSendMessage(
  token: string,
  chatId: string,
  text: string,
  options?: { disablePreview?: boolean },
) {
  return tgFetch({
    token,
    method: "sendMessage",
    body: {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: options?.disablePreview ?? true,
    },
  });
}

export async function telegramSetWebhook(
  token: string,
  url: string,
  secretToken: string,
) {
  return tgFetch({
    token,
    method: "setWebhook",
    body: {
      url,
      secret_token: secretToken,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    },
  });
}

export async function telegramDeleteWebhook(token: string) {
  return tgFetch({
    token,
    method: "deleteWebhook",
    body: { drop_pending_updates: true },
  });
}

// Helper de alto nivel: envia mensagem para o bot pessoal de um usuario do
// painel, decifrando o token. Falha em silencio (loga) se o usuario nao
// estiver com o Telegram ativo.
export async function enviarMensagemTelegram(
  userId: string,
  mensagem: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramAtivo: true,
      telegramBotToken: true,
      telegramChatId: true,
    },
  });
  if (!user || !user.telegramAtivo || !user.telegramBotToken || !user.telegramChatId) {
    return { ok: false, error: "Telegram nao configurado" };
  }
  let token: string;
  try {
    token = decrypt(user.telegramBotToken);
  } catch {
    return { ok: false, error: "Token invalido (falha ao decriptar)" };
  }
  const res = await telegramSendMessage(token, user.telegramChatId, mensagem);
  if (!res.ok) {
    console.error("[telegram] erro ao enviar para", userId, res.description);
    return { ok: false, error: res.description ?? "erro desconhecido" };
  }
  return { ok: true };
}

// Escape simples para entradas dinamicas em mensagens com parse_mode=HTML.
export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function webhookUrlPara(userId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${base}/api/telegram/webhook/${userId}`;
}
