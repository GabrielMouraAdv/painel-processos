import { prisma } from "@/lib/prisma";
import { filtroVisibilidadeCompromissos } from "@/lib/permissoes";
import { htmlEscape } from "@/lib/telegram";

// Geradores de mensagens textuais para o bot de Telegram (HTML simples).

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatHora(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatDataLonga(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Recife",
  }).format(d);
}

function formatDataCurta(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Recife",
  }).format(d);
}

type ItemAgenda = {
  hora: string | null;
  titulo: string;
  detalhe: string | null;
};

type DadosAgenda = {
  compromissos: ItemAgenda[];
  prazosTce: ItemAgenda[];
  prazosJud: ItemAgenda[];
};

async function carregarDia(userId: string, dia: Date): Promise<DadosAgenda> {
  const inicio = startOfDay(dia);
  const fim = endOfDay(dia);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, escritorioId: true },
  });
  if (!user) return { compromissos: [], prazosTce: [], prazosJud: [] };

  const [compromissos, prazosTce, prazosJud] = await Promise.all([
    prisma.compromisso.findMany({
      where: {
        escritorioId: user.escritorioId,
        advogadoId: userId,
        cumprido: false,
        dataInicio: { gte: inicio, lte: fim },
        ...filtroVisibilidadeCompromissos({ id: user.id, email: user.email }),
      },
      orderBy: { dataInicio: "asc" },
      select: {
        titulo: true,
        dataInicio: true,
        diaInteiro: true,
        local: true,
      },
    }),
    prisma.prazoTce.findMany({
      where: {
        cumprido: false,
        dispensado: false,
        advogadoRespId: userId,
        dataVencimento: { gte: inicio, lte: fim },
        processo: { escritorioId: user.escritorioId },
      },
      orderBy: { dataVencimento: "asc" },
      select: {
        tipo: true,
        dataVencimento: true,
        processo: {
          select: {
            numero: true,
            municipio: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.prazo.findMany({
      where: {
        cumprido: false,
        dispensado: false,
        advogadoRespId: userId,
        data: { gte: inicio, lte: fim },
        processo: { escritorioId: user.escritorioId },
      },
      orderBy: { data: "asc" },
      select: {
        tipo: true,
        data: true,
        hora: true,
        processo: { select: { numero: true, gestor: { select: { nome: true } } } },
      },
    }),
  ]);

  return {
    compromissos: compromissos.map((c) => ({
      hora: c.diaInteiro ? null : formatHora(c.dataInicio),
      titulo: c.titulo,
      detalhe: c.local,
    })),
    prazosTce: prazosTce.map((p) => ({
      hora: null,
      titulo: `${p.tipo} — Processo ${p.processo.numero}`,
      detalhe: p.processo.municipio?.nome ?? null,
    })),
    prazosJud: prazosJud.map((p) => ({
      hora: p.hora ?? null,
      titulo: `${p.tipo} — Processo ${p.processo.numero}`,
      detalhe: p.processo.gestor.nome,
    })),
  };
}

function formatBloco(titulo: string, itens: ItemAgenda[]): string {
  if (itens.length === 0) return "";
  const linhas = itens.map((i) => {
    const hora = i.hora ? `[${i.hora}] ` : "";
    const det = i.detalhe ? ` <i>(${htmlEscape(i.detalhe)})</i>` : "";
    return `• ${htmlEscape(hora)}<b>${htmlEscape(i.titulo)}</b>${det}`;
  });
  return `\n<b>${titulo}:</b>\n${linhas.join("\n")}`;
}

function vazio(d: DadosAgenda): boolean {
  return (
    d.compromissos.length === 0 &&
    d.prazosTce.length === 0 &&
    d.prazosJud.length === 0
  );
}

export async function gerarAgendaHoje(userId: string): Promise<string> {
  const hoje = new Date();
  const dados = await carregarDia(userId, hoje);
  const cabecalho = `📅 <b>Sua agenda de HOJE</b>\n${formatDataLonga(hoje)}`;
  if (vazio(dados)) {
    return `${cabecalho}\n\nVoce nao tem compromissos nem prazos para hoje. Aproveite! 🎉`;
  }
  const c = formatBloco("COMPROMISSOS", dados.compromissos);
  const pTce = formatBloco("PRAZOS TCE", dados.prazosTce);
  const pJud = formatBloco("PRAZOS JUDICIAIS", dados.prazosJud);
  return `${cabecalho}${c}${pTce}${pJud}\n\nBom trabalho! 💼`;
}

export async function gerarAgendaAmanha(userId: string): Promise<string> {
  const amanha = addDays(new Date(), 1);
  const dados = await carregarDia(userId, amanha);
  const cabecalho = `📅 <b>Sua agenda de AMANHA</b>\n${formatDataLonga(amanha)}`;
  if (vazio(dados)) {
    return `${cabecalho}\n\nNenhum compromisso ou prazo previsto para amanha.`;
  }
  const c = formatBloco("COMPROMISSOS", dados.compromissos);
  const pTce = formatBloco("PRAZOS TCE", dados.prazosTce);
  const pJud = formatBloco("PRAZOS JUDICIAIS", dados.prazosJud);
  return `${cabecalho}${c}${pTce}${pJud}`;
}

export async function gerarAgendaSemana(userId: string): Promise<string> {
  const partes: string[] = [`📆 <b>Sua agenda dos proximos 7 dias</b>`];
  const hoje = startOfDay(new Date());
  let totalItens = 0;
  for (let i = 0; i < 7; i++) {
    const dia = addDays(hoje, i);
    const dados = await carregarDia(userId, dia);
    if (vazio(dados)) continue;
    const todos = [
      ...dados.compromissos,
      ...dados.prazosTce,
      ...dados.prazosJud,
    ];
    totalItens += todos.length;
    const linhas = todos.map((it) => {
      const hora = it.hora ? `[${it.hora}] ` : "";
      return `   • ${htmlEscape(hora)}${htmlEscape(it.titulo)}`;
    });
    partes.push(
      `\n<b>${formatDataLonga(dia)}</b>\n${linhas.join("\n")}`,
    );
  }
  if (totalItens === 0) {
    partes.push("\n\nVoce nao tem compromissos nem prazos nos proximos 7 dias.");
  }
  return partes.join("");
}

export async function gerarPrazosVencendo(
  userId: string,
  dias = 7,
): Promise<string> {
  const hoje = startOfDay(new Date());
  const limite = endOfDay(addDays(hoje, dias));
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { escritorioId: true },
  });
  if (!user) return "Usuario nao encontrado.";

  const [pTce, pJud] = await Promise.all([
    prisma.prazoTce.findMany({
      where: {
        cumprido: false,
        dispensado: false,
        advogadoRespId: userId,
        dataVencimento: { gte: hoje, lte: limite },
        processo: { escritorioId: user.escritorioId },
      },
      orderBy: { dataVencimento: "asc" },
      select: {
        tipo: true,
        dataVencimento: true,
        processo: {
          select: {
            numero: true,
            municipio: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.prazo.findMany({
      where: {
        cumprido: false,
        dispensado: false,
        advogadoRespId: userId,
        data: { gte: hoje, lte: limite },
        processo: { escritorioId: user.escritorioId },
      },
      orderBy: { data: "asc" },
      select: {
        tipo: true,
        data: true,
        processo: { select: { numero: true } },
      },
    }),
  ]);

  if (pTce.length === 0 && pJud.length === 0) {
    return `Voce nao tem prazos vencendo nos proximos ${dias} dias. 👍`;
  }

  function diff(d: Date): string {
    const dias = Math.round(
      (startOfDay(d).getTime() - hoje.getTime()) / 86_400_000,
    );
    if (dias === 0) return "<b>HOJE</b>";
    if (dias === 1) return "amanha";
    return `em ${dias} dias`;
  }

  const linhasTce = pTce.map(
    (p) =>
      `• <b>${htmlEscape(p.tipo)}</b> — Proc. ${htmlEscape(p.processo.numero)} (${htmlEscape(p.processo.municipio?.nome ?? "—")}) — ${formatDataCurta(p.dataVencimento)} (${diff(p.dataVencimento)})`,
  );
  const linhasJud = pJud.map(
    (p) =>
      `• <b>${htmlEscape(p.tipo)}</b> — Proc. ${htmlEscape(p.processo.numero)} — ${formatDataCurta(p.data)} (${diff(p.data)})`,
  );

  let texto = `⏰ <b>Prazos vencendo nos proximos ${dias} dias</b>\n`;
  if (linhasTce.length > 0) {
    texto += `\n<b>TCE:</b>\n${linhasTce.join("\n")}`;
  }
  if (linhasJud.length > 0) {
    texto += `\n\n<b>JUDICIAIS:</b>\n${linhasJud.join("\n")}`;
  }
  return texto;
}

export async function gerarListaProcessos(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { escritorioId: true },
  });
  if (!user) return "Usuario nao encontrado.";

  const [proc, procTce] = await Promise.all([
    prisma.processo.findMany({
      where: { escritorioId: user.escritorioId, advogadoId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        numero: true,
        fase: true,
        gestor: { select: { nome: true } },
      },
    }),
    prisma.processoTce.findMany({
      where: {
        escritorioId: user.escritorioId,
        prazos: { some: { advogadoRespId: userId } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        numero: true,
        faseAtual: true,
        municipio: { select: { nome: true } },
      },
    }),
  ]);

  if (proc.length === 0 && procTce.length === 0) {
    return "Voce nao tem processos atribuidos no momento.";
  }

  const linhasJud = proc.map(
    (p) =>
      `• <code>${htmlEscape(p.numero)}</code> — ${htmlEscape(p.gestor.nome)} — <i>${htmlEscape(p.fase)}</i>`,
  );
  const linhasTce = procTce.map(
    (p) =>
      `• <code>${htmlEscape(p.numero)}</code> — ${htmlEscape(p.municipio?.nome ?? "—")} — <i>${htmlEscape(p.faseAtual)}</i>`,
  );

  let texto = "📁 <b>Seus processos</b> (ultimos 10 de cada modulo)\n";
  if (linhasJud.length > 0) {
    texto += `\n<b>JUDICIAIS:</b>\n${linhasJud.join("\n")}`;
  }
  if (linhasTce.length > 0) {
    texto += `\n\n<b>TCE:</b>\n${linhasTce.join("\n")}`;
  }
  return texto;
}

export async function gerarStatusGeral(userId: string): Promise<string> {
  const hoje = startOfDay(new Date());
  const fimHoje = endOfDay(hoje);
  const em7 = endOfDay(addDays(hoje, 7));
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, escritorioId: true, nome: true },
  });
  if (!user) return "Usuario nao encontrado.";

  const [compHoje, prazosTceProx, prazosJudProx, processosPend] =
    await Promise.all([
      prisma.compromisso.count({
        where: {
          escritorioId: user.escritorioId,
          advogadoId: userId,
          cumprido: false,
          dataInicio: { gte: hoje, lte: fimHoje },
          ...filtroVisibilidadeCompromissos({ id: user.id, email: user.email }),
        },
      }),
      prisma.prazoTce.count({
        where: {
          cumprido: false,
          dispensado: false,
          advogadoRespId: userId,
          dataVencimento: { gte: hoje, lte: em7 },
          processo: { escritorioId: user.escritorioId },
        },
      }),
      prisma.prazo.count({
        where: {
          cumprido: false,
          dispensado: false,
          advogadoRespId: userId,
          data: { gte: hoje, lte: em7 },
          processo: { escritorioId: user.escritorioId },
        },
      }),
      prisma.processoTce.count({
        where: {
          escritorioId: user.escritorioId,
          julgado: false,
          prazos: { some: { advogadoRespId: userId, cumprido: false } },
        },
      }),
    ]);

  return [
    `📊 <b>Status geral — ${htmlEscape(user.nome)}</b>`,
    "",
    `• ${compHoje} compromisso(s) hoje`,
    `• ${prazosTceProx + prazosJudProx} prazo(s) vencendo em 7 dias`,
    `   - TCE: ${prazosTceProx}`,
    `   - Judiciais: ${prazosJudProx}`,
    `• ${processosPend} processo(s) TCE ainda nao julgado(s)`,
  ].join("\n");
}

export function mensagemAjuda(): string {
  return [
    "📚 <b>Comandos disponiveis</b>",
    "",
    "/agenda — agenda de hoje (compromissos + prazos)",
    "/hoje — mesma coisa que /agenda",
    "/amanha — agenda de amanha",
    "/semana — agenda dos proximos 7 dias",
    "/vencendo — prazos vencendo nos proximos 7 dias",
    "/processos — seus ultimos 10 processos em cada modulo",
    "/status — resumo geral",
    "/cadastrar &lt;descricao&gt; — forca cadastro por texto",
    "/cancelar — cancela uma intencao pendente de cadastro",
    "/ajuda — esta mensagem",
    "",
    "📝 <b>Cadastro por texto livre</b>",
    "Tambem da pra me mandar mensagens em linguagem natural, por exemplo:",
    "• <i>reuniao amanha 14h</i>",
    "• <i>defesa do processo 25100291 pra sexta</i>",
    "• <i>consulta dentista terca 16h</i>",
    "",
    "Eu monto um resumo e voce confirma antes de cadastrar.",
  ].join("\n");
}

export function mensagemBoasVindas(nome: string): string {
  return [
    `👋 Ola, <b>${htmlEscape(nome)}</b>!`,
    "",
    "Sou sua <b>secretaria pessoal</b> do Painel Processos.",
    "Vou te avisar de compromissos e prazos no Telegram.",
    "",
    mensagemAjuda(),
  ].join("\n");
}
