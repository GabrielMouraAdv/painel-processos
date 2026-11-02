// Regras da aba "Agendamento de publicações" (planilha da triagem LIG).
//
// Copia fiel dos dash.calc da referencia (docs/referencia-painel-prazos.html):
// urgencia, resumo, proximo, conf_dia e conf_total. As funcoes trabalham com as
// linhas no formato da planilha (nome da coluna -> texto), como o painel do Claude,
// para nao haver diferenca de regra. O site nao recalcula prazos: as datas ja vem
// calculadas pela triagem.

export type LinhaLig = Record<string, string>;

export type Urgencia = {
  ID: string;
  Faltam: string;
  diasInterno: number | null;
  diasFatal: number | null;
  Tipo: "Sessão" | "TCE-PE" | "Judicial";
  prioritario: boolean;
  emAberto: boolean;
};

export type Resumo = {
  ativos: number;
  vencidos: number;
  ateAmanha: number;
  proximos7: number;
  semLegalOne: number;
};

export type Proximo = {
  ID: string;
  Faltam: string;
  peca: string;
  processo: string;
  cliente: string;
  prazoFatal: string;
};

export type ConfDia = { Data: string; A: number; B: number; emails: number; naoBateram: number };
export type ConfTotal = { mensagens: number; batem: number; excluidas: number };

// "Hoje" em America/Fortaleza, como "aaaa-mm-dd".
export function hojeFortaleza(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(agora);
}

// d/m/aaaa ou dd/mm/aaaa -> ms (meia-noite UTC); qualquer outra coisa -> null.
export function parseBR(s: string | null | undefined): number | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || "").trim());
  return m ? Date.UTC(+m[3], +m[2] - 1, +m[1]) : null;
}

export function urgencia(prazos: LinhaLig[], hojeTxt: string): Urgencia[] {
  const hoje = Date.parse(hojeTxt + "T00:00:00Z");
  const dias = (t: number | null) => (t === null ? null : Math.round((t - hoje) / 864e5));
  return prazos
    .filter((r) => r.ID)
    .map((r) => {
      const fechado = /protocolado|sem provid/i.test(r.Status || "");
      const di = dias(parseBR(r["Prazo interno"]) ?? parseBR(r["Prazo fatal"]));
      const df = dias(parseBR(r["Prazo fatal"]));
      const tipo: Urgencia["Tipo"] = /^SESS/i.test(r["Peça / providência"] || "")
        ? "Sessão"
        : /^TCE/i.test(r["Órgão / tribunal"] || "")
          ? "TCE-PE"
          : "Judicial";
      let faltam: string;
      if (fechado) faltam = "Concluído";
      else if (df !== null && df < 0) faltam = "Vencido";
      else if (di === null) faltam = "Sem data";
      else if (di < 0) faltam = "Interno passou";
      else if (di === 0) faltam = "Hoje";
      else if (di === 1) faltam = "Amanhã";
      else faltam = "Em " + di + " dias";
      return {
        ID: r.ID,
        Faltam: faltam,
        diasInterno: di,
        diasFatal: df,
        Tipo: tipo,
        prioritario: /PRIORIT/i.test(r["Observações / alertas"] || ""),
        emAberto: !fechado,
      };
    });
}

export function resumo(urg: Urgencia[], prazos: LinhaLig[]): Resumo {
  const ab = urg.filter((u) => u.emAberto);
  const lanc = new Map(prazos.map((r) => [r.ID, r["Lançado no Legal One?"]]));
  return {
    ativos: ab.length,
    vencidos: ab.filter((u) => u.Faltam === "Vencido").length,
    ateAmanha: ab.filter((u) => u.Faltam !== "Vencido" && u.diasInterno !== null && u.diasInterno <= 1).length,
    proximos7: ab.filter((u) => u.diasInterno !== null && u.diasInterno >= 2 && u.diasInterno <= 7).length,
    semLegalOne: ab.filter((u) => lanc.get(u.ID) !== "Sim").length,
  };
}

export function proximo(urg: Urgencia[], prazos: LinhaLig[]): Proximo | null {
  const by = new Map(prazos.map((r) => [r.ID, r]));
  const c = urg
    .filter((u) => u.emAberto && u.diasFatal !== null && u.diasFatal >= 0)
    .sort(
      (a, b) =>
        a.diasFatal! - b.diasFatal! ||
        Number(a.Tipo === "Sessão") - Number(b.Tipo === "Sessão") ||
        (a.diasInterno ?? 0) - (b.diasInterno ?? 0),
    );
  if (!c.length) return null;
  const r = by.get(c[0].ID)!;
  const df = c[0].diasFatal!;
  return {
    ID: r.ID,
    Faltam: df === 0 ? "Hoje" : df === 1 ? "Amanhã" : "Em " + df + " dias",
    peca: r["Peça / providência"],
    processo: r["Nº do processo"],
    cliente: r["Cliente / ente"],
    prazoFatal: r["Prazo fatal"],
  };
}

export function confDia(conf: LinhaLig[]): ConfDia[] {
  const m = new Map<string, ConfDia>();
  for (const r of conf) {
    const d = r["Data do diário"];
    if (!d) continue;
    const o = m.get(d) || { Data: d, A: 0, B: 0, emails: 0, naoBateram: 0 };
    const n = Number(r["Publicações extraídas"]) || 0;
    if (r.Assinatura === "A") o.A += n;
    else o.B += n;
    o.emails += 1;
    if (!/^sim$/i.test(r["Bate?"] || "")) o.naoBateram += 1;
    m.set(d, o);
  }
  const k = (s: string) => s.slice(6, 10) + s.slice(3, 5) + s.slice(0, 2);
  return Array.from(m.values()).sort((a, b) => k(a.Data).localeCompare(k(b.Data)));
}

export function confTotal(conf: LinhaLig[]): ConfTotal {
  return {
    mensagens: conf.filter((r) => r["ID da mensagem"]).length,
    batem: conf.filter((r) => /^sim$/i.test(r["Bate?"] || "")).length,
    excluidas: conf.reduce((s, r) => s + (Number(r["Excluídas (aposentadoria/pensão/reforma)"]) || 0), 0),
  };
}

// Ordem da tabela: em aberto por dias ate o interno, depois sem data, depois concluidos; empate pelo ID.
export function ordemTabela(u: Urgencia): number {
  return !u.emAberto ? 1e6 : u.diasInterno === null ? 1e5 : u.diasInterno;
}

// Faixa de cor da linha.
export function severidade(u: Urgencia): "bad" | "warn" | "done" | null {
  if (!u.emAberto) return "done";
  if (["Vencido", "Interno passou", "Hoje"].includes(u.Faltam)) return "bad";
  if (u.diasInterno !== null && u.diasInterno <= 3) return "warn";
  return null;
}

// Urgentes do badge do menu: vencidos + ate amanha.
export function urgentesLig(prazos: LinhaLig[], hojeTxt: string = hojeFortaleza()): number {
  const r = resumo(urgencia(prazos, hojeTxt), prazos);
  return r.vencidos + r.ateAmanha;
}

// Horas de dias uteis (seg a sex, em Fortaleza) entre o ultimo sync e agora.
// Acima de 30 a aba mostra o alerta: fim de semana nao conta, entao a sync de sexta
// continua valendo na segunda de manha.
export function horasUteisDesde(desde: Date, agora: Date = new Date()): number {
  const dow = new Intl.DateTimeFormat("en-US", { timeZone: "America/Fortaleza", weekday: "short" });
  let horas = 0;
  for (let t = desde.getTime(); t < agora.getTime(); t += 36e5) {
    const fatia = Math.min(36e5, agora.getTime() - t) / 36e5;
    const d = dow.format(new Date(t));
    if (d !== "Sat" && d !== "Sun") horas += fatia;
  }
  return horas;
}

export const LIMITE_HORAS_SYNC = 30;

// Registro do banco -> linha no formato da planilha (nomes das colunas).
type PrazoLigDb = {
  idPlanilha: string; status: string; lancadoLegalOne: string; prazoInternoTexto: string;
  prazoFatalTexto: string; peca: string; prazoContagem: string; fundamento: string;
  numeroProcesso: string; orgao: string; cliente: string; parteInteressada: string;
  atoPublicado: string; diarioEdicao: string; dataPublicacaoTexto: string; primeiroDiaTexto: string;
  origemLig: string; nomePesquisado: string; observacoes: string; pubId: string;
};

export function linhaPrazo(p: PrazoLigDb): LinhaLig {
  return {
    ID: p.idPlanilha,
    Status: p.status,
    "Lançado no Legal One?": p.lancadoLegalOne,
    "Prazo interno": p.prazoInternoTexto,
    "Prazo fatal": p.prazoFatalTexto,
    "Peça / providência": p.peca,
    "Prazo (dias) e contagem": p.prazoContagem,
    Fundamento: p.fundamento,
    "Nº do processo": p.numeroProcesso,
    "Órgão / tribunal": p.orgao,
    "Cliente / ente": p.cliente,
    "Parte interessada": p.parteInteressada,
    "Ato publicado (resumo)": p.atoPublicado,
    "Diário e edição": p.diarioEdicao,
    "Data de publicação (LIG)": p.dataPublicacaoTexto,
    "1º dia do prazo": p.primeiroDiaTexto,
    "Origem LIG (A advogados / B prefeituras)": p.origemLig,
    "Nome pesquisado": p.nomePesquisado,
    "Observações / alertas": p.observacoes,
    Publicação: p.pubId,
  };
}

// So o que a regra de urgencia le (badge do menu, sem carregar textos longos).
export function linhaPrazoMinima(p: {
  idPlanilha: string; status: string; prazoInternoTexto: string; prazoFatalTexto: string;
  peca: string; orgao: string; observacoes: string; lancadoLegalOne: string; numeroProcesso: string;
}): LinhaLig {
  return {
    ID: p.idPlanilha,
    Status: p.status,
    "Prazo interno": p.prazoInternoTexto,
    "Prazo fatal": p.prazoFatalTexto,
    "Nº do processo": p.numeroProcesso,
    "Peça / providência": p.peca,
    "Órgão / tribunal": p.orgao,
    "Observações / alertas": p.observacoes,
    "Lançado no Legal One?": p.lancadoLegalOne,
  };
}

export function linhaConferencia(c: {
  dataDiarioTexto: string; assinatura: string; idMensagem: string; publicacoesExtraidas: string;
  bate: string; excluidas: string;
}): LinhaLig {
  return {
    "Data do diário": c.dataDiarioTexto,
    Assinatura: c.assinatura,
    "ID da mensagem": c.idMensagem,
    "Publicações extraídas": c.publicacoesExtraidas,
    "Bate?": c.bate,
    "Excluídas (aposentadoria/pensão/reforma)": c.excluidas,
  };
}

// ---------------------------------------------------------------------------
// Alem da referencia: cruzamento com a agenda do Legal One e o "RO virtual".
// Nao mexem nas regras acima (contagens, badge); so acrescentam informacao.
// ---------------------------------------------------------------------------

// Familia da peca, para casar a planilha com o titulo do Legal One ("ED - 2321763-7 - Brejo - PF: 06/11").
export type FamiliaPeca =
  | "ED" | "RO" | "AGRAVO" | "APELACAO" | "CONTRARRAZOES" | "DEFESA" | "AUDIENCIA" | "SESSAO" | "OUTRA";

export function familiaPeca(texto: string): FamiliaPeca {
  // Tira os numeros de processo antes ("25101086-7ED001" nao e embargos).
  const t = (texto || "").replace(/\d[\d.\-]*[A-Z]{0,3}\d*/g, " ");
  // Antes dos embargos: "Cr ao Edcl" sao contrarrazoes.
  if (/contrarraz|\bcr\b|\bcrr\b/i.test(t)) return "CONTRARRAZOES";
  if (/\bED\b|\bedcl\b|embargos?\s+de\s+declara/i.test(t)) return "ED";
  if (/\bRO\b|recurso\s+ordin/i.test(t)) return "RO";
  if (/agravo|\bagtr\b/i.test(t)) return "AGRAVO";
  if (/apela[çc][ãa]o|\bapl\b/i.test(t)) return "APELACAO";
  if (/audi[êe]ncia/i.test(t)) return "AUDIENCIA";
  if (/sess[ãa]o/i.test(t)) return "SESSAO";
  if (/defesa|manifesta/i.test(t)) return "DEFESA";
  return "OUTRA";
}

const RE_NUM_TCE = /\b\d{7,8}-\d(?:[A-Z]{2,3}\d{3})?\b/;
const RE_NUM_CNJ = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/;

// Numero do processo so com digitos ("25101086-7ED001" -> "251010867001"); "" se nao houver.
export function chaveProcesso(texto: string): string {
  const m = RE_NUM_CNJ.exec(texto || "") ?? RE_NUM_TCE.exec(texto || "");
  return m ? m[0].replace(/\D/g, "") : "";
}

const isoBR = (s: string) => {
  const t = parseBR(s);
  return t === null ? null : new Date(t).toISOString().slice(0, 10);
};
const br = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// Item da agenda do Legal One ja importado como Compromisso (dia em aaaa-mm-dd).
export type ItemAgendaL1 = { titulo: string; dia: string; advogado: string };

export type SituacaoAgenda =
  | { tipo: "agendado"; item: ItemAgendaL1 }
  | { tipo: "data_diferente"; item: ItemAgendaL1 }
  | { tipo: "outra_peca"; item: ItemAgendaL1 }
  | { tipo: "nao_agendado" };

// Mesmo processo e mesma peca na agenda = agendado; se o dia nao bate com o prazo
// interno nem com o fatal da planilha, avisa a diferenca. Mesmo processo com outra
// peca so informa.
export function situacaoAgenda(r: LinhaLig, agenda: ItemAgendaL1[]): SituacaoAgenda {
  const chave = chaveProcesso(r["Nº do processo"]);
  if (!chave) return { tipo: "nao_agendado" };
  const doProcesso = agenda.filter((a) => chaveProcesso(a.titulo) === chave);
  if (!doProcesso.length) return { tipo: "nao_agendado" };
  const fam = familiaPeca(r["Peça / providência"]);
  const mesmaPeca = fam === "OUTRA" ? [] : doProcesso.filter((a) => familiaPeca(a.titulo) === fam);
  if (!mesmaPeca.length) return { tipo: "outra_peca", item: doProcesso[0] };
  const datas = [isoBR(r["Prazo interno"]), isoBR(r["Prazo fatal"])].filter(Boolean);
  const bate = mesmaPeca.find((a) => datas.includes(a.dia));
  if (bate) return { tipo: "agendado", item: bate };
  const fatal = isoBR(r["Prazo fatal"]) ?? "";
  const perto = [...mesmaPeca].sort(
    (a, b) => Math.abs(Date.parse(a.dia) - Date.parse(fatal)) - Math.abs(Date.parse(b.dia) - Date.parse(fatal)),
  )[0];
  return { tipo: "data_diferente", item: perto };
}

// RO virtual: quando a mesma decisao abre embargos e recurso ordinario, o escritorio
// agenda so os embargos (que interrompem o prazo do RO). Se os embargos forem perdidos,
// o RO continua correndo; o RO virtual e um lembrete N dias uteis antes do fatal do RO.
export const RO_VIRTUAL_DIAS_UTEIS = 3;

export type RoVirtual = {
  ID: string; // linha do RO na planilha
  idEmbargos: string;
  dataVirtual: string; // aaaa-mm-dd
  fatalRo: string; // dd/mm/aaaa
  situacao: "lembrete" | "suspenso" | "embargos_perdidos";
};

export function rosVirtuais(
  prazos: LinhaLig[],
  urg: Urgencia[],
  ehDiaUtil: (iso: string, tce: boolean) => boolean,
): Map<string, RoVirtual> {
  const u = new Map(urg.map((x) => [x.ID, x]));
  const out = new Map<string, RoVirtual>();
  for (const r of prazos) {
    const x = u.get(r.ID);
    if (!x?.emAberto || familiaPeca(r["Peça / providência"]) !== "RO") continue;
    const chave = chaveProcesso(r["Nº do processo"]);
    const fatal = isoBR(r["Prazo fatal"]);
    if (!chave || !fatal) continue;
    const embargos = prazos.filter(
      (e) => e.ID !== r.ID && familiaPeca(e["Peça / providência"]) === "ED" && chaveProcesso(e["Nº do processo"]) === chave,
    );
    // Decidiram nao opor embargos: o RO e o prazo real, sem lembrete.
    const vivos = embargos.filter((e) => !/sem provid/i.test(e.Status || ""));
    if (!vivos.length) continue;
    const ed = vivos.find((e) => u.get(e.ID)?.emAberto) ?? vivos[0];
    const tce = /^TCE/i.test(r["Órgão / tribunal"] || "");
    let dia = fatal;
    for (let n = 0; n < RO_VIRTUAL_DIAS_UTEIS; ) {
      dia = new Date(Date.parse(dia + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
      if (ehDiaUtil(dia, tce)) n++;
    }
    const situacao = /protocolado/i.test(ed.Status || "")
      ? "suspenso"
      : u.get(ed.ID)?.Faltam === "Vencido"
        ? "embargos_perdidos"
        : "lembrete";
    out.set(r.ID, { ID: r.ID, idEmbargos: ed.ID, dataVirtual: dia, fatalRo: r["Prazo fatal"], situacao });
  }
  return out;
}

export function rotuloRoVirtual(v: RoVirtual): string {
  if (v.situacao === "suspenso") return "Suspenso pelos embargos protocolados";
  if (v.situacao === "embargos_perdidos") return `Embargos perdidos · RO vence ${v.fatalRo.slice(0, 5)}`;
  return `RO virtual · ${br(v.dataVirtual)}`;
}

// ---------------------------------------------------------------------------
// Dispensa feita no painel. A linha dispensada passa a ter o Status "Sem providencia",
// e as regras acima ja a tratam como encerrada (contagens, badge, RO virtual: embargos
// dispensados deixam o RO como prazo real). Vale so enquanto a linha for a mesma.
// ---------------------------------------------------------------------------

export type DispensaLig = {
  id: string;
  idPlanilha: string;
  numeroProcesso: string;
  prazoFatalTexto: string;
  motivo: string;
  usuarioNome: string;
  createdAt: string; // ISO
};

export const STATUS_DISPENSADO = "Sem providência (dispensado no painel)";

export function dispensaDaLinha(r: LinhaLig, dispensas: DispensaLig[]): DispensaLig | null {
  return (
    dispensas.find(
      (d) => d.idPlanilha === r.ID && d.numeroProcesso === r["Nº do processo"] && d.prazoFatalTexto === r["Prazo fatal"],
    ) ?? null
  );
}

export function aplicarDispensas(prazos: LinhaLig[], dispensas: DispensaLig[]): LinhaLig[] {
  if (!dispensas.length) return prazos;
  return prazos.map((r) => (dispensaDaLinha(r, dispensas) ? { ...r, Status: STATUS_DISPENSADO } : r));
}

export function dispensaLig(d: {
  id: string; idPlanilha: string; numeroProcesso: string; prazoFatalTexto: string; motivo: string;
  usuarioNome: string; createdAt: Date;
}): DispensaLig {
  return {
    id: d.id,
    idPlanilha: d.idPlanilha,
    numeroProcesso: d.numeroProcesso,
    prazoFatalTexto: d.prazoFatalTexto,
    motivo: d.motivo,
    usuarioNome: d.usuarioNome,
    createdAt: d.createdAt.toISOString(),
  };
}
