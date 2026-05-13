import type { Compromisso, Prazo, PrazoTce } from "@prisma/client";

import { ACOES, registrarLog } from "@/lib/audit-log";
import { getBanca, isBancaSlug } from "@/lib/bancas";
import type { ContextoUsuario, IntencaoIA } from "@/lib/anthropic-client";
import { podeUsarCategoriasPrivadas } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { htmlEscape } from "@/lib/telegram";

const FUSO = "America/Recife";

function formatDataLonga(iso: string | null): string {
  if (!iso) return "(sem data)";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "(data invalida)";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: FUSO,
  }).format(d);
}

function formatHora(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO,
    hour12: false,
  }).format(d);
}

function diffDias(deIso: string | null, ateIso: string | null): number | null {
  if (!deIso || !ateIso) return null;
  const a = new Date(deIso);
  const b = new Date(ateIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export type Intencao = IntencaoIA;

export async function montarContextoUsuario(
  userId: string,
): Promise<ContextoUsuario | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nome: true,
      email: true,
      escritorioId: true,
      bancaSlug: true,
    },
  });
  if (!user) return null;

  // 20 processos mais recentes (TCE + judicial) onde o usuario tem alguma
  // relacao (responsavel direto no judicial, ou prazo TCE atribuido).
  const [procJud, procTce] = await Promise.all([
    prisma.processo.findMany({
      where: {
        escritorioId: user.escritorioId,
        OR: [
          { advogadoId: user.id },
          { prazos: { some: { advogadoRespId: user.id } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        numero: true,
        objeto: true,
        gestor: { select: { nome: true } },
      },
    }),
    prisma.processoTce.findMany({
      where: {
        escritorioId: user.escritorioId,
        prazos: { some: { advogadoRespId: user.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        numero: true,
        objeto: true,
        municipio: { select: { nome: true } },
      },
    }),
  ]);

  const processos: ContextoUsuario["processos"] = [];
  for (const p of procTce) {
    processos.push({
      id: p.id,
      numero: p.numero,
      tipo: "tce",
      descricao: `${p.municipio?.nome ?? "—"} | ${p.objeto.slice(0, 60)}`,
    });
  }
  for (const p of procJud) {
    processos.push({
      id: p.id,
      numero: p.numero,
      tipo: "judicial",
      descricao: `${p.gestor.nome} | ${p.objeto.slice(0, 60)}`,
    });
  }

  return {
    agoraIso: new Date().toISOString(),
    nomeUsuario: user.nome,
    podeUsarPrivadas: podeUsarCategoriasPrivadas({
      id: user.id,
      email: user.email,
    }),
    processos,
    bancasUsuarioSlug: user.bancaSlug ? [user.bancaSlug] : null,
  };
}

export function gerarResumoConfirmacao(intencao: Intencao): string {
  const d = intencao.dados;
  const linhas: string[] = ["📝 <b>Vou cadastrar:</b>", ""];

  if (intencao.acao === "cadastrar_prazo") {
    linhas.push(`⏰ <b>${htmlEscape(d.titulo || "(sem titulo)")}</b>`);
    linhas.push(
      `📆 Vencimento: ${htmlEscape(formatDataLonga(d.dataInicio))}`,
    );
    if (d.processoVinculado) {
      linhas.push(
        `📁 Processo: <code>${htmlEscape(d.processoVinculado.numero)}</code> (${d.processoVinculado.tipo.toUpperCase()})`,
      );
    } else {
      linhas.push("⚠️ <i>Prazo sem processo vinculado</i>");
    }
  } else {
    linhas.push(`📅 <b>${htmlEscape(d.titulo || "(sem titulo)")}</b>`);
    linhas.push(`📆 ${htmlEscape(formatDataLonga(d.dataInicio))}`);
    const h = formatHora(d.dataInicio);
    if (h && !d.diaInteiro) linhas.push(`🕒 As ${h}`);
    const hFim = formatHora(d.dataFim);
    if (hFim && !d.diaInteiro) {
      linhas.push(`⏱️ Termina as ${hFim}`);
    }
    if (d.local) linhas.push(`📍 ${htmlEscape(d.local)}`);
    if (d.processoVinculado) {
      linhas.push(
        `📁 Processo: <code>${htmlEscape(d.processoVinculado.numero)}</code>`,
      );
    }
    const banca = d.escritorioResponsavel
      ? getBanca(d.escritorioResponsavel)
      : null;
    if (banca) {
      linhas.push(`🏢 ${htmlEscape(banca.sigla)} — ${htmlEscape(banca.nome)}`);
    }
    if (intencao.tipo && intencao.tipo !== "ESCRITORIO") {
      linhas.push(`🔒 Categoria: <i>${intencao.tipo}</i>`);
    }
  }

  if (intencao.duvidas.length > 0) {
    linhas.push("");
    linhas.push("❓ <b>Antes de confirmar:</b>");
    for (const q of intencao.duvidas) {
      linhas.push(`• ${htmlEscape(q)}`);
    }
    linhas.push("");
    linhas.push("Responda a duvida acima ou digite NAO para cancelar.");
  } else {
    linhas.push("");
    linhas.push(
      "Confirma? Responda <b>SIM</b>, <b>EDITAR &lt;ajuste&gt;</b> ou <b>NAO</b>.",
    );
  }
  return linhas.join("\n");
}

type ResultadoExecucao = {
  ok: boolean;
  mensagem: string;
  link?: string;
  audit?: { entidade: string; entidadeId: string };
};

export async function executarIntencao(
  userId: string,
  intencao: Intencao,
): Promise<ResultadoExecucao> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nome: true, email: true, escritorioId: true },
  });
  if (!user) {
    return { ok: false, mensagem: "Usuario nao encontrado." };
  }

  if (
    intencao.acao !== "cadastrar_compromisso" &&
    intencao.acao !== "cadastrar_prazo"
  ) {
    return {
      ok: false,
      mensagem: "Acao nao suportada para execucao automatica.",
    };
  }

  const dadosIA = intencao.dados;
  if (!dadosIA.titulo || !dadosIA.dataInicio) {
    return {
      ok: false,
      mensagem: "Dados insuficientes (titulo ou data faltando).",
    };
  }
  const dataPrincipal = new Date(dadosIA.dataInicio);
  if (Number.isNaN(dataPrincipal.getTime())) {
    return { ok: false, mensagem: "Data invalida." };
  }

  const podePrivadas = podeUsarCategoriasPrivadas({
    id: user.id,
    email: user.email,
  });

  try {
    if (intencao.acao === "cadastrar_compromisso") {
      const categoriaSolicitada =
        intencao.tipo === "PROFISSIONAL_PRIVADO" ||
        intencao.tipo === "PESSOAL"
          ? intencao.tipo
          : "ESCRITORIO";
      const categoria =
        categoriaSolicitada !== "ESCRITORIO" && !podePrivadas
          ? "ESCRITORIO"
          : categoriaSolicitada;
      const privado = categoria !== "ESCRITORIO";

      const escritorioResp =
        dadosIA.escritorioResponsavel &&
        isBancaSlug(dadosIA.escritorioResponsavel)
          ? dadosIA.escritorioResponsavel
          : null;

      const compromisso: Pick<Compromisso, "id"> = await prisma.compromisso.create({
        data: {
          titulo: dadosIA.titulo.trim().slice(0, 200),
          descricao: dadosIA.descricao?.trim() || null,
          dataInicio: dataPrincipal,
          dataFim: dadosIA.dataFim ? new Date(dadosIA.dataFim) : null,
          diaInteiro: dadosIA.diaInteiro,
          tipo: "OUTRO",
          categoria,
          privado,
          escritorioResponsavelSlug: escritorioResp,
          local: dadosIA.local?.trim() || null,
          advogadoId: user.id,
          processoTceId:
            dadosIA.processoVinculado?.tipo === "tce"
              ? dadosIA.processoVinculado.id
              : null,
          processoId:
            dadosIA.processoVinculado?.tipo === "judicial"
              ? dadosIA.processoVinculado.id
              : null,
          escritorioId: user.escritorioId,
        },
        select: { id: true },
      });

      const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
      return {
        ok: true,
        mensagem: gerarMensagemSucessoCompromisso(intencao),
        link: `${base}/app/compromissos`,
        audit: { entidade: "Compromisso", entidadeId: compromisso.id },
      };
    }

    // cadastrar_prazo
    const proc = dadosIA.processoVinculado;
    if (!proc) {
      return {
        ok: false,
        mensagem:
          "Prazo precisa de processo vinculado. Cadastre pelo painel ou indique o processo na proxima tentativa.",
      };
    }

    if (proc.tipo === "tce") {
      // Confirma que o processo pertence ao escritorio do usuario.
      const pTce = await prisma.processoTce.findFirst({
        where: { id: proc.id, escritorioId: user.escritorioId },
        select: { id: true },
      });
      if (!pTce) {
        return { ok: false, mensagem: "Processo TCE nao encontrado." };
      }
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const diasUteis = Math.max(
        1,
        Math.round((dataPrincipal.getTime() - hoje.getTime()) / 86_400_000),
      );
      const novo: Pick<PrazoTce, "id"> = await prisma.prazoTce.create({
        data: {
          processoId: proc.id,
          tipo: dadosIA.titulo.trim().slice(0, 80),
          dataIntimacao: hoje,
          dataVencimento: dataPrincipal,
          diasUteis,
          prorrogavel: true,
          prorrogacaoPedida: false,
          cumprido: false,
          advogadoRespId: user.id,
          observacoes: dadosIA.descricao?.trim() || null,
        },
        select: { id: true },
      });
      const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
      return {
        ok: true,
        mensagem: gerarMensagemSucessoPrazo(intencao, "tce"),
        link: `${base}/app/tce/processos/${proc.id}`,
        audit: { entidade: "PrazoTce", entidadeId: novo.id },
      };
    }

    // judicial
    const pJud = await prisma.processo.findFirst({
      where: { id: proc.id, escritorioId: user.escritorioId },
      select: { id: true },
    });
    if (!pJud) {
      return { ok: false, mensagem: "Processo judicial nao encontrado." };
    }
    const horaStr = dadosIA.diaInteiro ? null : formatHora(dadosIA.dataInicio);
    const novoJud: Pick<Prazo, "id"> = await prisma.prazo.create({
      data: {
        processoId: proc.id,
        tipo: dadosIA.titulo.trim().slice(0, 80),
        data: dataPrincipal,
        hora: horaStr,
        observacoes: dadosIA.descricao?.trim() || null,
        cumprido: false,
        advogadoRespId: user.id,
      },
      select: { id: true },
    });
    const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    return {
      ok: true,
      mensagem: gerarMensagemSucessoPrazo(intencao, "judicial"),
      link: `${base}/app/processos/${proc.id}`,
      audit: { entidade: "Prazo", entidadeId: novoJud.id },
    };
  } catch (err) {
    console.error("[telegram-cadastro] erro", err);
    return {
      ok: false,
      mensagem:
        "Houve um erro ao cadastrar. Tente novamente ou cadastre pelo painel.",
    };
  }
}

function gerarMensagemSucessoCompromisso(intencao: Intencao): string {
  const d = intencao.dados;
  const linhas = [
    "✅ <b>Compromisso cadastrado!</b>",
    "",
    `📅 <b>${htmlEscape(d.titulo)}</b>`,
    `📆 ${htmlEscape(formatDataLonga(d.dataInicio))}`,
  ];
  const h = formatHora(d.dataInicio);
  if (h && !d.diaInteiro) linhas.push(`🕒 As ${h}`);
  if (d.local) linhas.push(`📍 ${htmlEscape(d.local)}`);
  return linhas.join("\n");
}

function gerarMensagemSucessoPrazo(
  intencao: Intencao,
  tipo: "tce" | "judicial",
): string {
  const d = intencao.dados;
  const diff = diffDias(new Date().toISOString(), d.dataInicio);
  const linhas = [
    "✅ <b>Prazo cadastrado!</b>",
    "",
    `⏰ <b>${htmlEscape(d.titulo)}</b> (${tipo.toUpperCase()})`,
    `📆 Vencimento: ${htmlEscape(formatDataLonga(d.dataInicio))}`,
  ];
  if (diff !== null && diff >= 0) {
    linhas.push(
      diff === 0
        ? "⚠️ <b>Vence HOJE</b>"
        : `Em ${diff} dia(s) corridos a partir de hoje`,
    );
  }
  if (d.processoVinculado) {
    linhas.push(
      `📁 Processo: <code>${htmlEscape(d.processoVinculado.numero)}</code>`,
    );
  }
  return linhas.join("\n");
}

// Limite anti-spam: 50 cadastros por dia por usuario via Telegram.
export async function passouLimiteDeCadastros(
  userId: string,
  limite = 50,
): Promise<boolean> {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const count = await prisma.logAuditoria.count({
    where: {
      userId,
      acao: { in: [ACOES.CRIAR_COMPROMISSO, ACOES.CRIAR_PRAZO, ACOES.CRIAR_PRAZO_TCE] },
      detalhes: { contains: '"viaTelegram":true' },
      createdAt: { gte: inicioDia },
    },
  });
  return count >= limite;
}

export async function registrarCadastroViaTelegram(
  userId: string,
  resultado: ResultadoExecucao,
  intencao: Intencao,
  nomeUsuario: string,
) {
  if (!resultado.audit) return;
  const acao =
    resultado.audit.entidade === "Compromisso"
      ? ACOES.CRIAR_COMPROMISSO
      : resultado.audit.entidade === "PrazoTce"
        ? ACOES.CRIAR_PRAZO_TCE
        : ACOES.CRIAR_PRAZO;
  await registrarLog({
    userId,
    acao,
    entidade: resultado.audit.entidade,
    entidadeId: resultado.audit.entidadeId,
    descricao: `${nomeUsuario} cadastrou ${resultado.audit.entidade} via Telegram: "${intencao.dados.titulo}"`,
    detalhes: {
      viaTelegram: true,
      acaoIA: intencao.acao,
      tipo: intencao.tipo,
      confidence: intencao.confidence,
    },
  });
}
