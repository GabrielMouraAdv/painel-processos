// Tribunais reconhecidos para calculo de dias uteis.
// TCE_PE = Tribunal de Contas de Pernambuco (recesso forense 20/12 a 20/01).
// TJPE = Tribunal de Justica de Pernambuco.
// TRF5 = Tribunal Regional Federal da 5a Regiao.
// TRF1, STJ, STF = caem no calendario nacional comum.
export type TribunalCalendar =
  | "TCE_PE"
  | "TJPE"
  | "TRF5"
  | "TRF1"
  | "STJ"
  | "STF";

// ============================================================
// Recesso forense do TCE-PE (20/12 a 20/01, anual).
// ============================================================
export const RECESSO_TCE_PE = {
  inicio: { dia: 20, mes: 12 },
  fim: { dia: 20, mes: 1 },
} as const;

// ============================================================
// Listas de feriados por tribunal e ano.
// Estrutura preparada para acrescentar 2027 e seguintes.
// Cada lista inclui feriados nacionais + estaduais + municipais
// quando aplicaveis + dias do recesso forense daquele tribunal.
// ============================================================

// Feriados nacionais minimos (TRF1, STJ, STF, fallback geral).
const FERIADOS_NACIONAIS: Record<number, string[]> = {
  2025: [
    "2025-01-01",
    "2025-03-03",
    "2025-03-04",
    "2025-04-18",
    "2025-04-21",
    "2025-05-01",
    "2025-06-19",
    "2025-09-07",
    "2025-10-12",
    "2025-11-02",
    "2025-11-15",
    "2025-12-25",
  ],
  2026: [
    "2026-01-01",
    "2026-02-16",
    "2026-02-17",
    "2026-04-03",
    "2026-04-21",
    "2026-05-01",
    "2026-06-04",
    "2026-09-07",
    "2026-10-12",
    "2026-11-02",
    "2026-11-15",
    "2026-12-25",
  ],
  2027: [
    "2027-01-01",
    "2027-02-08",
    "2027-02-09",
    "2027-03-26",
    "2027-04-21",
    "2027-05-01",
    "2027-05-27",
    "2027-09-07",
    "2027-10-12",
    "2027-11-02",
    "2027-11-15",
    "2027-12-25",
  ],
};

// TCE-PE — feriados oficiais + recesso 20/12 a 20/01.
export const FERIADOS_TCE_PE: Record<number, string[]> = {
  2025: [
    ...FERIADOS_NACIONAIS[2025],
    "2025-06-24", // Sao Joao - estadual PE
  ],
  2026: [
    "2026-01-01",
    "2026-02-13", // dia sem expediente (compensacao horario)
    "2026-02-16", // Carnaval
    "2026-02-17", // Carnaval
    "2026-02-18", // Quarta-feira de Cinzas
    "2026-03-06", // Data Magna PE
    "2026-04-02", // Paixao de Cristo
    "2026-04-03", // Sexta-feira da Paixao
    "2026-04-21", // Tiradentes
    "2026-05-01", // Dia do Trabalho
    "2026-06-22", // Corpus Christi
    "2026-06-23", // Corpus Christi
    "2026-06-24", // Sao Joao
    "2026-07-16", // Nossa Senhora do Carmo (Recife)
    "2026-09-07", // Independencia
    "2026-10-12", // Nossa Senhora Aparecida
    "2026-10-30", // Dia do Servidor Publico
    "2026-11-02", // Finados
    "2026-11-15", // Proclamacao da Republica
    "2026-11-20", // Zumbi e Consciencia Negra
    "2026-12-08", // Nossa Senhora da Conceicao (Recife)
    "2026-12-24", // dia sem expediente
    "2026-12-25", // Natal
    "2026-12-31", // dia sem expediente
    // Recesso forense 20/12/2026 a 20/01/2027 — parte de 2026
    "2026-12-20",
    "2026-12-21",
    "2026-12-22",
    "2026-12-23",
    "2026-12-26",
    "2026-12-27",
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
  ],
  // Stub 2027: parte de janeiro do recesso forense TCE-PE
  2027: [
    "2027-01-01",
    "2027-01-02",
    "2027-01-03",
    "2027-01-04",
    "2027-01-05",
    "2027-01-06",
    "2027-01-07",
    "2027-01-08",
    "2027-01-09",
    "2027-01-10",
    "2027-01-11",
    "2027-01-12",
    "2027-01-13",
    "2027-01-14",
    "2027-01-15",
    "2027-01-16",
    "2027-01-17",
    "2027-01-18",
    "2027-01-19",
    "2027-01-20",
  ],
};

// TJPE — feriados + recessos judiciarios.
export const FERIADOS_TJPE: Record<number, string[]> = {
  2025: [...FERIADOS_NACIONAIS[2025], "2025-06-24"],
  2026: [
    "2026-01-01",
    // Recesso judiciario inicio 02-06/01
    "2026-01-02",
    "2026-01-05",
    "2026-01-06",
    "2026-02-16", // Carnaval
    "2026-02-17", // Carnaval
    "2026-02-18", // Quarta-feira de Cinzas
    "2026-03-06", // Data Magna PE
    "2026-04-02", // Paixao de Cristo
    "2026-04-03", // Paixao de Cristo
    "2026-04-21", // Tiradentes
    "2026-05-01", // Dia do Trabalho
    "2026-06-22", // Corpus Christi (transferido)
    // Recesso judiciario meio 23-30/06
    "2026-06-23",
    "2026-06-24", // Sao Joao
    "2026-06-25",
    "2026-06-26",
    "2026-06-29",
    "2026-06-30",
    "2026-07-16", // Nossa Senhora do Carmo
    "2026-08-10", // Criacao dos Cursos Juridicos
    "2026-09-07", // Independencia
    "2026-10-12", // Nossa Senhora Aparecida
    "2026-10-30", // Dia do Servidor Publico
    "2026-11-02", // Finados
    "2026-11-15", // Proclamacao da Republica
    "2026-11-20", // Zumbi
    "2026-12-08", // Nossa Senhora da Conceicao
    // Recesso judiciario fim 20-31/12
    "2026-12-21",
    "2026-12-22",
    "2026-12-23",
    "2026-12-24",
    "2026-12-25", // Natal
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
  ],
  // Stub 2027: inicio do recesso judiciario
  2027: ["2027-01-01", "2027-01-04", "2027-01-05", "2027-01-06"],
};

// TRF5 — feriados + recessos.
export const FERIADOS_TRF5: Record<number, string[]> = {
  2025: [...FERIADOS_NACIONAIS[2025], "2025-06-24"],
  2026: [
    // Recesso judiciario inicio 01-06/01
    "2026-01-01",
    "2026-01-02",
    "2026-01-05",
    "2026-01-06",
    "2026-02-16", // Carnaval
    "2026-02-17", // Carnaval
    "2026-03-06", // Data Magna PE
    // Semana Santa 01-05/04
    "2026-04-01",
    "2026-04-02",
    "2026-04-03",
    "2026-04-21", // Tiradentes
    "2026-05-01", // Dia do Trabalho
    "2026-06-24", // Sao Joao
    "2026-07-16", // Nossa Senhora do Carmo
    "2026-08-11", // Criacao dos Cursos Juridicos
    "2026-09-07", // Independencia
    "2026-10-12", // Nossa Senhora Aparecida
    "2026-11-01", // Todos os Santos
    "2026-11-02", // Finados
    "2026-11-15", // Proclamacao da Republica
    "2026-11-20", // Zumbi
    "2026-12-08", // Dia da Justica
    // Recesso fim 20-31/12
    "2026-12-21",
    "2026-12-22",
    "2026-12-23",
    "2026-12-24",
    "2026-12-25", // Natal
    "2026-12-28",
    "2026-12-29",
    "2026-12-30",
    "2026-12-31",
  ],
  // Stub 2027: inicio do recesso TRF5
  2027: ["2027-01-01", "2027-01-04", "2027-01-05", "2027-01-06"],
};

// ============================================================
// Helpers internos
// ============================================================

function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayLocal(d: Date | string): Date {
  const base = typeof d === "string" ? new Date(`${d}T00:00:00`) : new Date(d);
  base.setHours(0, 0, 0, 0);
  return base;
}

const FERIADOS_POR_TRIBUNAL: Record<TribunalCalendar, Record<number, string[]>> =
  {
    TCE_PE: FERIADOS_TCE_PE,
    TJPE: FERIADOS_TJPE,
    TRF5: FERIADOS_TRF5,
    TRF1: FERIADOS_NACIONAIS,
    STJ: FERIADOS_NACIONAIS,
    STF: FERIADOS_NACIONAIS,
  };

// Cache de Sets por tribunal+ano para evitar reconstruir a cada chamada.
const setsCache = new Map<string, Set<string>>();

function getFeriadosSet(
  tribunal: TribunalCalendar,
  year: number,
): Set<string> {
  const key = `${tribunal}:${year}`;
  const cached = setsCache.get(key);
  if (cached) return cached;
  const lista = FERIADOS_POR_TRIBUNAL[tribunal][year] ?? [];
  const s = new Set(lista);
  setsCache.set(key, s);
  return s;
}

// ============================================================
// API publica
// ============================================================

/**
 * Verifica se a data esta no recesso forense do TCE-PE (20/dez a 20/jan).
 * Usado pelo banner discreto da pagina /app/tce/prazos.
 */
export function isDataNoRecesso(data: Date | string): boolean {
  const d = startOfDayLocal(data);
  const mes = d.getMonth() + 1;
  const dia = d.getDate();
  if (mes === 12 && dia >= RECESSO_TCE_PE.inicio.dia) return true;
  if (mes === 1 && dia <= RECESSO_TCE_PE.fim.dia) return true;
  return false;
}

export function ehDiaUtil(
  data: Date | string,
  tribunal: TribunalCalendar = "TCE_PE",
): boolean {
  const d = startOfDayLocal(data);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  const set = getFeriadosSet(tribunal, d.getFullYear());
  if (set.has(toIsoDay(d))) return false;
  // Fallback: para TCE-PE garante o periodo de recesso mesmo se o ano nao
  // tiver lista carregada (anos futuros sem stub).
  if (tribunal === "TCE_PE" && isDataNoRecesso(d)) return false;
  return true;
}

export function calcularDataVencimento(
  dataInicio: Date | string,
  diasUteis: number,
  tribunal: TribunalCalendar = "TCE_PE",
): Date {
  const d = startOfDayLocal(dataInicio);
  let restantes = diasUteis;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    if (ehDiaUtil(d, tribunal)) restantes--;
  }
  return d;
}

/**
 * Variante explicita por tribunal — equivalente a calcularDataVencimento
 * com tribunal obrigatorio, util para call sites mais legiveis.
 */
export function calcularDataVencimentoPorTribunal(
  dataInicio: Date | string,
  diasUteis: number,
  tribunal: TribunalCalendar,
): Date {
  return calcularDataVencimento(dataInicio, diasUteis, tribunal);
}

export function diasUteisEntre(
  dataInicio: Date | string,
  dataFim: Date | string,
  tribunal: TribunalCalendar = "TCE_PE",
): number {
  const a = startOfDayLocal(dataInicio);
  const b = startOfDayLocal(dataFim);
  const sinal = b.getTime() < a.getTime() ? -1 : 1;
  const inicio = sinal === 1 ? a : b;
  const fim = sinal === 1 ? b : a;
  let dias = 0;
  const cursor = new Date(inicio);
  while (cursor.getTime() < fim.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    if (ehDiaUtil(cursor, tribunal)) dias++;
  }
  return dias * sinal;
}

export function diasUteisRestantes(
  dataFim: Date | string,
  hoje: Date = new Date(),
  tribunal: TribunalCalendar = "TCE_PE",
): number {
  return diasUteisEntre(hoje, dataFim, tribunal);
}

/**
 * Verifica se o intervalo (inicio, fim] passa pelo periodo de recesso forense
 * TCE-PE (cobre 20/12 a 20/01, que tambem engloba os recessos curtos do
 * TJPE e TRF5). Usado pelo badge "Inclui recesso" no card do prazo.
 */
export function periodoIncluiRecesso(
  dataInicio: Date | string,
  dataFim: Date | string,
): boolean {
  const a = startOfDayLocal(dataInicio);
  const b = startOfDayLocal(dataFim);
  const inicio = a.getTime() <= b.getTime() ? a : b;
  const fim = a.getTime() <= b.getTime() ? b : a;
  const cursor = new Date(inicio);
  while (cursor.getTime() <= fim.getTime()) {
    if (isDataNoRecesso(cursor)) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}
