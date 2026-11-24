import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { diaDe } from "@/lib/datas";
import { ehDiaUtil } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import {
  aplicarDispensas,
  dispensaLig,
  hojeFortaleza,
  linhaPrazo,
  parseBR,
  rosVirtuais,
  situacaoAgenda,
  sugestaoDaLinha,
  sugestaoLig,
  urgencia,
  type ItemAgendaL1,
  type SituacaoAgenda,
} from "@/lib/prazos-lig";

export const dynamic = "force-dynamic";

// Exporta para o Excel os prazos pendentes de agendamento da aba "Agendamento de
// publicacoes": em aberto e fora da agenda do Legal One (nao agendado ou so outra
// peca do processo), sem o RO virtual. Mesmo criterio do cartao "Sem agenda no
// Legal One". Gera .xlsx formatado: aba "Agendar" so com o necessario para lancar
// na agenda (ordenada pela data de agendamento, cor por urgencia) e aba
// "Publicacoes" com o texto integral.

const SITUACAO: Record<SituacaoAgenda["tipo"], string> = {
  agendado: "Agendado",
  data_diferente: "Agendado com data diferente",
  outra_peca: "Só outra peça do processo na agenda",
  nao_agendado: "Não agendado",
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const desdeAgenda = new Date(Date.now() - 120 * 864e5);
  const [prazosDb, agendaDb, dispensasDb, sugestoesDb, avulsosDb] = await Promise.all([
    prisma.prazoLig.findMany({ where: { ativoNaPlanilha: true }, orderBy: { idPlanilha: "asc" } }),
    prisma.compromisso.findMany({
      where: { descricao: { startsWith: "Importado da agenda do Legal One" }, dataInicio: { gte: desdeAgenda } },
      select: { titulo: true, dataInicio: true, createdAt: true, advogado: { select: { nome: true } } },
    }),
    prisma.dispensaPrazoLig.findMany({ where: { desfeitaEm: null } }),
    prisma.sugestaoAgendamentoLig.findMany({ where: { substituidaEm: null }, orderBy: { createdAt: "desc" } }),
    prisma.agendamentoAvulsoLig.findMany({ where: { concluidoEm: null }, orderBy: { createdAt: "asc" } }),
  ]);

  const prazos = aplicarDispensas(prazosDb.map(linhaPrazo), dispensasDb.map(dispensaLig));
  const urg = urgencia(prazos, hojeFortaleza());
  const agenda: ItemAgendaL1[] = agendaDb.map((c) => ({ titulo: c.titulo, dia: diaDe(c.dataInicio), advogado: c.advogado.nome }));
  const virtuais = rosVirtuais(prazos, urg, (iso, tce) => ehDiaUtil(iso, tce ? "TCE_PE" : "TRF1"));
  const aberto = new Map(urg.map((u) => [u.ID, u]));

  // Em aberto e sem RO virtual. "Agendar" = nao agendado ou so outra peca do processo
  // (mesmo criterio do cartao "Sem agenda no Legal One"); "Ja agendados" = mesma peca,
  // em amarelo quando a data da agenda nao bate com a da triagem (conferir).
  const abertos = prazos
    .map((r) => ({ r, u: aberto.get(r.ID), s: situacaoAgenda(r, agenda) }))
    .filter(({ r, u }) => u?.emAberto && !virtuais.has(r.ID))
    .sort((a, b) => (a.u!.diasInterno ?? 99999) - (b.u!.diasInterno ?? 99999));
  const pendentes = abertos;
  const agendaLidaEm = agendaDb.reduce<Date | null>((m, c) => (!m || c.createdAt > m ? c.createdAt : m), null);

  // Texto da publicacao: aba Publicacoes; se faltar, a coluna V da aba Prazos.
  const pubIds = Array.from(new Set(pendentes.map(({ r }) => r["Publicação"]).filter(Boolean)));
  const pubs = pubIds.length ? await prisma.publicacaoLig.findMany({ where: { pubId: { in: pubIds } }, select: { pubId: true, texto: true } }) : [];
  const textoPub = new Map(pubs.map((p) => [p.pubId, p.texto]));
  const colunaV = new Map(prazosDb.map((p) => [p.idPlanilha, p.textoPublicacao]));

  const colunas = Object.keys(linhaPrazo(prazosDb[0] ?? ({} as (typeof prazosDb)[number])));
  const sugestoes = sugestoesDb.map(sugestaoLig);

  // Linha enxuta: so o que e preciso para lancar na agenda do Legal One. O texto
  // integral da publicacao vai para a segunda aba.
  type Linha = {
    agendar: string; fatal: string; peca: string; prazo: string; processo: string; orgao: string;
    cliente: string; legalOne: string; onde: string; jaAgendado: boolean; alertas: string; origem: string; id: string;
    ato: string; diario: string; publicadoEm: string; texto: string;
  };
  const rotuloL1 = (s: SituacaoAgenda) =>
    s.tipo === "agendado" ? "Agendado" : s.tipo === "data_diferente" ? "Agendado (conferir data)" : s.tipo === "outra_peca" ? "Só outra peça" : "Não agendado";
  const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const lidaEm = agendaLidaEm ? agendaLidaEm.toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" }) : "—";
  // Onde esta na agenda do Legal One (ou por que nao esta): o que a Renata confere.
  const ondeL1 = (s: SituacaoAgenda) => {
    if (s.tipo === "nao_agendado") return `Não está na agenda do Legal One importada no painel (lida em ${lidaEm})`;
    const it = `${s.item.advogado.split(" ")[0]} · ${ddmm(s.item.dia)} · "${s.item.titulo}"`;
    if (s.tipo === "outra_peca") return `Só outra peça do processo na agenda: ${it}`;
    if (s.tipo === "data_diferente") return `${it}: a data da agenda não bate com o prazo interno nem com o fatal da triagem`;
    return it;
  };
  void SITUACAO;

  const linhas: Linha[] = pendentes.map(({ r, s }) => {
    // Agendamento: o escolhido no painel ou, sem escolha, o sugerido pela triagem.
    const sug = sugestaoDaLinha(r, sugestoes);
    return {
      agendar: sug?.dataAgenda || r["Prazo interno"] || r["Prazo fatal"] || "",
      fatal: r["Prazo fatal"] ?? "",
      peca: sug?.agendamento || r["Peça / providência"] || "",
      prazo: sug?.prazo || r["Prazo (dias) e contagem"] || "",
      processo: r["Nº do processo"] ?? "",
      orgao: r["Órgão / tribunal"] ?? "",
      cliente: r["Cliente / ente"] ?? "",
      legalOne: rotuloL1(s),
      onde: ondeL1(s),
      jaAgendado: s.tipo === "agendado" || s.tipo === "data_diferente",
      alertas: r["Observações / alertas"] ?? "",
      origem: sug ? "Painel" : "Triagem (não confirmada)",
      id: r.ID,
      ato: r["Ato publicado (resumo)"] ?? "",
      diario: r["Diário e edição"] ?? "",
      publicadoEm: r["Data de publicação (LIG)"] ?? "",
      texto: textoPub.get(r["Publicação"]) || colunaV.get(r.ID) || "",
    };
  });

  // Agendamentos avulsos (fora da triagem LIG): saem quando a mesma peca do
  // processo ja esta na agenda do Legal One.
  for (const a of avulsosDb) {
    const r: Record<string, string> = Object.fromEntries(colunas.map((c) => [c, ""]));
    Object.assign(r, {
      ID: `AV-${a.id.slice(-5).toUpperCase()}`,
      Status: "A fazer",
      "Lançado no Legal One?": "Não",
      "Prazo interno": a.dataAgenda,
      "Prazo fatal": a.prazoFatalTexto,
      "Peça / providência": a.peca,
      "Prazo (dias) e contagem": a.prazo,
      "Nº do processo": a.numeroProcesso,
      "Órgão / tribunal": a.orgao,
      "Cliente / ente": a.cliente,
      "Observações / alertas": a.observacoes,
    });
    const s = situacaoAgenda(r, agenda);
    linhas.push({
      agendar: a.dataAgenda, fatal: a.prazoFatalTexto, peca: a.peca, prazo: a.prazo,
      processo: a.numeroProcesso, orgao: a.orgao, cliente: a.cliente, legalOne: rotuloL1(s),
      onde: ondeL1(s), jaAgendado: s.tipo === "agendado" || s.tipo === "data_diferente",
      alertas: a.observacoes ?? "", origem: "Avulso", id: r.ID,
      ato: "", diario: "", publicadoEm: "", texto: a.textoPublicacao ?? "",
    });
  }
  linhas.sort((a, b) => (parseBR(a.agendar) ?? Infinity) - (parseBR(b.agendar) ?? Infinity));

  const hoje = hojeFortaleza(); // aaaa-mm-dd
  const [ha, hm, hd] = hoje.split("-").map(Number);
  const hojeMs = Date.UTC(ha, hm - 1, hd);
  // d/m/aaaa vira data de verdade no Excel (filtra e ordena); outro texto ("—") fica como esta.
  const data = (t: string): string | Date => {
    const ms = parseBR(t);
    return ms === null ? t : new Date(ms);
  };

  const NAVY = "FF1F2A44";
  const cabecalho = (cel: ExcelJS.Cell, titulo: string) => {
    cel.value = titulo;
    cel.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cel.alignment = { vertical: "middle", wrapText: true };
  };
  const wb = new ExcelJS.Workbook();
  wb.creator = "Painel de Processos";

  const COLS: { titulo: string; largura: number; valor: (l: Linha) => string | Date }[] = [
    { titulo: "Prazo interno (data na agenda)", largura: 14, valor: (l) => data(l.agendar) },
    { titulo: "Prazo fatal", largura: 12, valor: (l) => data(l.fatal) },
    { titulo: "Peça / providência", largura: 38, valor: (l) => l.peca },
    { titulo: "Prazo e contagem", largura: 26, valor: (l) => l.prazo },
    { titulo: "Nº do processo", largura: 20, valor: (l) => l.processo },
    { titulo: "Órgão", largura: 24, valor: (l) => l.orgao },
    { titulo: "Cliente / ente", largura: 26, valor: (l) => l.cliente },
    { titulo: "Legal One", largura: 18, valor: (l) => l.legalOne },
    { titulo: "Onde está / conferência na agenda", largura: 48, valor: (l) => l.onde },
    { titulo: "Alertas", largura: 60, valor: (l) => l.alertas },
    { titulo: "Origem", largura: 14, valor: (l) => l.origem },
    { titulo: "ID", largura: 10, valor: (l) => l.id },
  ];
  const dataHoje = `${String(hd).padStart(2, "0")}/${String(hm).padStart(2, "0")}/${ha}`;
  const aAgendar = linhas.filter((l) => !l.jaAgendado);
  const jaAgendados = linhas.filter((l) => l.jaAgendado);

  const montarAba = (nome: string, titulo: string, subtitulo: string, itens: Linha[], colorir: boolean) => {
    const ws = wb.addWorksheet(nome, {
      views: [{ state: "frozen", xSplit: 1, ySplit: 4 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "4:4" },
    });
    COLS.forEach((c, k) => (ws.getColumn(k + 1).width = c.largura));
    ws.getCell("A1").value = titulo;
    ws.getCell("A1").font = { bold: true, size: 14, color: { argb: NAVY } };
    ws.getCell("A2").value = subtitulo;
    ws.getCell("A2").font = { italic: true, size: 9, color: { argb: "FF666666" } };
    COLS.forEach((c, k) => cabecalho(ws.getRow(4).getCell(k + 1), c.titulo));
    ws.getRow(4).height = 22;
    itens.forEach((l, n) => {
      const row = ws.getRow(5 + n);
      const ms = parseBR(l.agendar);
      let cor: string | null = null;
      if (!colorir) cor = l.legalOne === "Agendado (conferir data)" ? "FFFEF3C7" : "FFE7F5EC";
      else if (ms !== null && ms <= hojeMs) cor = "FFFDE2E1";
      else if ((ms !== null && ms <= hojeMs + 864e5) || l.legalOne === "Agendado (conferir data)") cor = "FFFEF3C7";
      COLS.forEach((c, k) => {
        const cel = row.getCell(k + 1);
        cel.value = c.valor(l);
        cel.alignment = { vertical: "top", wrapText: true };
        cel.border = { bottom: { style: "thin", color: { argb: "FFD0D5DD" } } };
        if (cel.value instanceof Date) cel.numFmt = "dd/mm/yyyy";
        if (k === 0 || k === 2) cel.font = { bold: true };
        if (cor) cel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cor } };
      });
    });
    if (itens.length) ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + itens.length, column: COLS.length } };
  };

  montarAba(
    "Agendar",
    `Prazos pendentes de agendamento no Legal One — ${dataHoje}`,
    `${aAgendar.length} prazo(s) · lançar todos no Legal One assim que possível; a primeira coluna é o prazo interno, a data que vai na agenda · conferidos na agenda importada no painel (lida em ${lidaEm}) · ` +
      "vermelho = prazo interno hoje ou vencido · amarelo = amanhã · texto integral na aba Publicações",
    aAgendar,
    true,
  );
  montarAba(
    "Já agendados",
    `Já agendados no Legal One (conferido em ${dataHoje})`,
    `${jaAgendados.length} item(ns) em aberto que já estão na agenda · amarelo = a data da agenda não bate com a da triagem (conferir)`,
    jaAgendados,
    false,
  );

  // Segunda aba: a publicacao integral, para consulta.
  const pub = wb.addWorksheet("Publicações", { views: [{ state: "frozen", ySplit: 1 }] });
  const PC: [string, number, (l: Linha) => string | Date][] = [
    ["ID", 10, (l) => l.id],
    ["Nº do processo", 18, (l) => l.processo],
    ["Ato publicado (resumo)", 50, (l) => l.ato],
    ["Diário", 22, (l) => l.diario],
    ["Publicado em", 12, (l) => data(l.publicadoEm)],
    ["Texto da publicação", 110, (l) => l.texto],
  ];
  PC.forEach(([t, w], j) => {
    pub.getColumn(j + 1).width = w;
    cabecalho(pub.getRow(1).getCell(j + 1), t);
  });
  linhas.forEach((l, i) => {
    PC.forEach(([, , f], j) => {
      const cel = pub.getRow(2 + i).getCell(j + 1);
      cel.value = f(l);
      cel.alignment = { vertical: "top", wrapText: true };
      if (cel.value instanceof Date) cel.numFmt = "dd/mm/yyyy";
    });
  });

  const buf = await wb.xlsx.writeBuffer();
  const nome = `prazos-pendentes-de-agendamento-${hoje}.xlsx`;
  return new NextResponse(Buffer.from(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
