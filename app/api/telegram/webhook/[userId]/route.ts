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
import {
  interpretarMensagem,
  type IntencaoIA,
} from "@/lib/anthropic-client";
import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { tryDecrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  executarIntencao,
  gerarResumoConfirmacao,
  montarContextoUsuario,
  passouLimiteDeCadastros,
  registrarCadastroViaTelegram,
} from "@/lib/telegram-cadastro";
import {
  telegramSendMessage,
  type TelegramUpdate,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INTENCAO_TTL_MIN = 10;
const SIM_WORDS = new Set([
  "sim",
  "s",
  "yes",
  "y",
  "ok",
  "okay",
  "confirma",
  "confirmar",
  "✅",
  "👍",
]);
const NAO_WORDS = new Set([
  "nao",
  "não",
  "n",
  "no",
  "cancela",
  "cancelar",
  "❌",
]);

function comandoDe(texto: string): string {
  const c = texto.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return c.replace(/@.+$/, "");
}

function ehSim(t: string): boolean {
  return SIM_WORDS.has(t.trim().toLowerCase());
}
function ehNao(t: string): boolean {
  return NAO_WORDS.has(t.trim().toLowerCase());
}
function pedidoEditar(t: string): string | null {
  const m = t.trim().match(/^(?:editar|edita|edit|muda|mudar|altera|alterar)\b[: ]?\s*(.*)$/i);
  if (!m) return null;
  return m[1].trim() || "(pediu para editar mas nao especificou)";
}

async function expirarIntencoesAntigas(userId: string) {
  const limite = new Date(Date.now() - INTENCAO_TTL_MIN * 60_000);
  await prisma.intencaoTelegram.updateMany({
    where: {
      userId,
      estado: { in: ["AGUARDANDO_CONFIRMACAO", "AGUARDANDO_DUVIDA"] },
      createdAt: { lt: limite },
    },
    data: { estado: "EXPIRADO", expirado: true },
  });
}

async function buscarIntencaoPendente(userId: string) {
  return prisma.intencaoTelegram.findFirst({
    where: {
      userId,
      estado: { in: ["AGUARDANDO_CONFIRMACAO", "AGUARDANDO_DUVIDA"] },
      expirado: false,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function descartarIntencoesPendentes(userId: string) {
  await prisma.intencaoTelegram.updateMany({
    where: {
      userId,
      estado: { in: ["AGUARDANDO_CONFIRMACAO", "AGUARDANDO_DUVIDA"] },
    },
    data: { estado: "CANCELADO" },
  });
}

async function tratarTextoLivre(
  user: { id: string; nome: string; email: string | null },
  token: string,
  chatId: string,
  texto: string,
): Promise<string> {
  const ctx = await montarContextoUsuario(user.id);
  if (!ctx) return "Nao consegui carregar seu contexto, tente de novo.";

  let intencao: IntencaoIA;
  try {
    intencao = await interpretarMensagem(texto, ctx);
  } catch (err) {
    console.error("[telegram] erro IA", err);
    return "Nao consegui interpretar agora (problema com a IA). Tente reformular ou use os comandos /agenda, /vencendo etc.";
  }

  if (intencao.acao === "consultar") {
    return "Para consultar, use /agenda, /semana, /amanha, /vencendo, /processos ou /status.";
  }
  if (intencao.acao === "outro") {
    return [
      "Nao entendi o que voce quer fazer.",
      "Tente algo como:",
      "• <i>reuniao amanha 14h</i>",
      "• <i>defesa do processo 25100291 pra sexta</i>",
      "• <i>consulta dentista terca 16h</i>",
    ].join("\n");
  }

  if (await passouLimiteDeCadastros(user.id)) {
    await registrarLog({
      userId: user.id,
      acao: ACOES.CADASTRO_VIA_TELEGRAM_LIMITE,
      entidade: "User",
      entidadeId: user.id,
      descricao: `${user.nome} excedeu o limite diario de cadastros via Telegram`,
    });
    return "Voce atingiu o limite diario de 50 cadastros via Telegram. Cadastre pelo painel ou tente amanha.";
  }

  await descartarIntencoesPendentes(user.id);

  const tipoFinal =
    intencao.acao === "cadastrar_compromisso" &&
    (intencao.tipo === "PROFISSIONAL_PRIVADO" ||
      intencao.tipo === "PESSOAL") &&
    !ctx.podeUsarPrivadas
      ? "ESCRITORIO"
      : intencao.tipo;
  const intencaoAjustada: IntencaoIA = {
    ...intencao,
    tipo: tipoFinal,
  };

  await prisma.intencaoTelegram.create({
    data: {
      userId: user.id,
      estado:
        intencaoAjustada.duvidas.length > 0
          ? "AGUARDANDO_DUVIDA"
          : "AGUARDANDO_CONFIRMACAO",
      acao: intencaoAjustada.acao,
      dadosBrutos: JSON.stringify(intencaoAjustada),
      mensagemOriginal: texto.slice(0, 2000),
      duvidaAtual:
        intencaoAjustada.duvidas.length > 0
          ? intencaoAjustada.duvidas.join(" | ")
          : null,
    },
  });

  await registrarLog({
    userId: user.id,
    acao: ACOES.INTENCAO_TELEGRAM,
    entidade: "User",
    entidadeId: user.id,
    descricao: `${user.nome} iniciou intencao "${intencaoAjustada.acao}" via Telegram`,
    detalhes: {
      acao: intencaoAjustada.acao,
      tipo: intencaoAjustada.tipo,
      confidence: intencaoAjustada.confidence,
      duvidas: intencaoAjustada.duvidas.length,
    },
  });

  return gerarResumoConfirmacao(intencaoAjustada);
}

async function tratarRespostaConfirmacao(
  user: { id: string; nome: string; email: string | null },
  pendente: { id: string; dadosBrutos: string },
  textoResposta: string,
): Promise<string> {
  let intencao: IntencaoIA;
  try {
    intencao = JSON.parse(pendente.dadosBrutos) as IntencaoIA;
  } catch {
    await prisma.intencaoTelegram.update({
      where: { id: pendente.id },
      data: { estado: "CANCELADO" },
    });
    return "Intencao corrompida, foi cancelada. Tente cadastrar de novo.";
  }

  if (ehSim(textoResposta)) {
    const res = await executarIntencao(user.id, intencao);
    await prisma.intencaoTelegram.update({
      where: { id: pendente.id },
      data: { estado: res.ok ? "CONFIRMADO" : "CANCELADO" },
    });
    if (res.ok) {
      await registrarCadastroViaTelegram(user.id, res, intencao, user.nome);
    }
    if (res.link) {
      return `${res.mensagem}\n\n🔗 ${res.link}`;
    }
    return res.mensagem;
  }
  if (ehNao(textoResposta)) {
    await prisma.intencaoTelegram.update({
      where: { id: pendente.id },
      data: { estado: "CANCELADO" },
    });
    return "Cadastro cancelado. ❌";
  }

  // Tratamento de "editar X" ou texto livre como ajuste.
  const ajuste = pedidoEditar(textoResposta);
  if (ajuste || !ehSim(textoResposta)) {
    const ctx = await montarContextoUsuario(user.id);
    if (!ctx) {
      return "Nao consegui carregar seu contexto para refinar.";
    }
    const novaMensagem = [
      "Reinterprete considerando o estado atual e o ajuste do usuario.",
      "",
      "Intencao atual (JSON):",
      JSON.stringify(intencao),
      "",
      "Ajuste solicitado pelo usuario:",
      ajuste ?? textoResposta,
    ].join("\n");
    try {
      const nova = await interpretarMensagem(novaMensagem, ctx);
      const tipoFinal =
        (nova.tipo === "PROFISSIONAL_PRIVADO" || nova.tipo === "PESSOAL") &&
        !ctx.podeUsarPrivadas
          ? "ESCRITORIO"
          : nova.tipo;
      const novaAjustada: IntencaoIA = { ...nova, tipo: tipoFinal };

      if (nova.acao !== "cadastrar_compromisso" && nova.acao !== "cadastrar_prazo") {
        return "Nao consegui aplicar o ajuste. Mande SIM para confirmar a versao anterior ou NAO para cancelar.";
      }
      await prisma.intencaoTelegram.update({
        where: { id: pendente.id },
        data: {
          dadosBrutos: JSON.stringify(novaAjustada),
          estado:
            novaAjustada.duvidas.length > 0
              ? "AGUARDANDO_DUVIDA"
              : "AGUARDANDO_CONFIRMACAO",
          duvidaAtual:
            novaAjustada.duvidas.length > 0
              ? novaAjustada.duvidas.join(" | ")
              : null,
        },
      });
      return gerarResumoConfirmacao(novaAjustada);
    } catch (err) {
      console.error("[telegram] erro refinar", err);
      return "Tive um problema ao aplicar o ajuste. Responda SIM para usar a versao anterior ou NAO para cancelar.";
    }
  }
  return "Nao entendi. Responda <b>SIM</b>, <b>NAO</b> ou descreva o que mudar (ex.: <i>edita: as 16h</i>).";
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
      email: true,
      telegramAtivo: true,
      telegramBotToken: true,
      telegramChatId: true,
    },
  });
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

  if (String(msg.chat.id) !== user.telegramChatId) {
    await telegramSendMessage(
      token,
      String(msg.chat.id),
      "Este bot e pessoal e nao atende a outras pessoas.",
    );
    return NextResponse.json({ ok: true });
  }

  await expirarIntencoesAntigas(user.id);

  const textoBruto = msg.text.trim();
  const cmd = comandoDe(textoBruto);

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
      case "/cancelar": {
        await descartarIntencoesPendentes(user.id);
        resposta = "Intencao pendente cancelada (se havia alguma).";
        break;
      }
      case "/cadastrar": {
        const descricao = textoBruto.replace(/^\/cadastrar(@\S+)?\s*/i, "").trim();
        if (!descricao) {
          resposta =
            "Use no formato: <code>/cadastrar reuniao amanha 14h</code>";
          break;
        }
        resposta = await tratarTextoLivre(user, token, user.telegramChatId, descricao);
        break;
      }
      default: {
        comandoConhecido = false;
        if (textoBruto.startsWith("/")) {
          resposta =
            "Comando nao reconhecido. Envie /ajuda para ver os comandos disponiveis.";
          break;
        }
        // Se ja existe intencao pendente, tratar a resposta como confirmacao/ajuste.
        const pendente = await buscarIntencaoPendente(user.id);
        if (pendente) {
          resposta = await tratarRespostaConfirmacao(
            user,
            pendente,
            textoBruto,
          );
        } else {
          resposta = await tratarTextoLivre(
            user,
            token,
            user.telegramChatId,
            textoBruto,
          );
        }
      }
    }
  } catch (err) {
    console.error("[telegram webhook] erro", cmd, err);
    resposta =
      "Ops, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns segundos.";
  }

  await telegramSendMessage(token, user.telegramChatId, resposta);

  await registrarLog({
    userId: user.id,
    acao: ACOES.COMANDO_TELEGRAM,
    entidade: "User",
    entidadeId: user.id,
    descricao: `${user.nome} enviou ${comandoConhecido ? cmd : textoBruto.startsWith("/") ? "(comando desconhecido)" : "(texto livre)"} via Telegram`,
    detalhes: { comando: comandoConhecido ? cmd : null },
    ip: extrairIp(req),
  });

  return NextResponse.json({ ok: true });
}
