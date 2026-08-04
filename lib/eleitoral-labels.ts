// Constantes e helpers do modulo eleitoral que podem ser usados tanto no
// servidor quanto em componentes client (sem imports de next-auth/prisma).

export const CLASSES_ELEITORAIS = [
  { value: "REPRESENTACAO", label: "Representacao (Rp)" },
  { value: "AIJE", label: "AIJE" },
  { value: "AIME", label: "AIME" },
  { value: "PETICAO", label: "Peticao" },
  { value: "MANDADO_SEGURANCA", label: "Mandado de Seguranca" },
  { value: "RECURSO", label: "Recurso" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const POLOS_ELEITORAIS = [
  { value: "ATIVO", label: "Polo ativo (autor)" },
  { value: "PASSIVO", label: "Polo passivo (defesa)" },
] as const;

export const STATUS_ELEITORAIS = [
  { value: "EM_TRAMITACAO", label: "Em tramitacao" },
  { value: "JULGADO", label: "Julgado" },
  { value: "ARQUIVADO", label: "Arquivado" },
] as const;

// ------------------------------------------------------------
// Status dos prazos — cada um tem cor propria no calendario.
// ------------------------------------------------------------

export type StatusPrazo =
  | "PENDENTE"
  | "IMPORTANTE"
  | "EM_ELABORACAO"
  | "ENVIADO_REVISAO"
  | "CUMPRIDO"
  | "PERDIDO"
  | "DISPENSADO";

export const STATUS_PRAZO_ELEITORAL: Array<{
  value: StatusPrazo;
  label: string;
  /** Cor da bolinha/legenda e da borda esquerda do evento. */
  cor: string;
  /** Classes do badge dentro da celula do dia. */
  badge: string;
  /** Classe do quadradinho da legenda. */
  legenda: string;
}> = [
  {
    value: "IMPORTANTE",
    label: "Importante",
    cor: "#dc2626",
    badge: "bg-red-50 text-red-800 border-red-600",
    legenda: "bg-red-600",
  },
  {
    value: "PENDENTE",
    label: "Pendente",
    cor: "#2563eb",
    badge: "bg-blue-50 text-blue-800 border-blue-600",
    legenda: "bg-blue-600",
  },
  {
    value: "EM_ELABORACAO",
    label: "Em elaboracao",
    cor: "#ea580c",
    badge: "bg-orange-50 text-orange-800 border-orange-600",
    legenda: "bg-orange-600",
  },
  {
    value: "ENVIADO_REVISAO",
    label: "Enviado para revisao",
    cor: "#0891b2",
    badge: "bg-cyan-50 text-cyan-800 border-cyan-600",
    legenda: "bg-cyan-600",
  },
  {
    value: "CUMPRIDO",
    label: "Cumprido",
    cor: "#16a34a",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-600",
    legenda: "bg-emerald-600",
  },
  {
    value: "PERDIDO",
    label: "Perdido",
    cor: "#7c3aed",
    badge: "bg-violet-50 text-violet-800 border-violet-600",
    legenda: "bg-violet-600",
  },
  {
    value: "DISPENSADO",
    label: "Dispensado",
    cor: "#94a3b8",
    badge: "bg-slate-100 text-slate-600 border-slate-400",
    legenda: "bg-slate-400",
  },
];

export function statusPrazoInfo(value: string) {
  return (
    STATUS_PRAZO_ELEITORAL.find((s) => s.value === value) ??
    STATUS_PRAZO_ELEITORAL[1]
  );
}

export function labelStatusPrazo(value: string): string {
  return statusPrazoInfo(value).label;
}

/** Status que encerram o prazo (nao aparecem como pendencia). */
export const STATUS_ENCERRADOS: StatusPrazo[] = [
  "CUMPRIDO",
  "PERDIDO",
  "DISPENSADO",
];

export const CATEGORIAS_DOCUMENTO_ELEITORAL = [
  { value: "INICIAL", label: "Inicial / Representacao" },
  { value: "DEFESA", label: "Defesa / Contestacao" },
  { value: "DECISAO", label: "Decisao / Sentenca / Acordao" },
  { value: "RECURSO", label: "Recurso" },
  { value: "PROVA", label: "Prova (video, print, midia)" },
  { value: "PARECER", label: "Parecer / Nota tecnica" },
  { value: "PROCURACAO", label: "Procuracao / Documentos da parte" },
  { value: "OUTRO", label: "Outro" },
] as const;

export function labelCategoriaDocumento(value: string): string {
  return (
    CATEGORIAS_DOCUMENTO_ELEITORAL.find((c) => c.value === value)?.label ??
    value
  );
}

export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function labelClasseEleitoral(value: string): string {
  return CLASSES_ELEITORAIS.find((c) => c.value === value)?.label ?? value;
}

export function labelPoloEleitoral(value: string): string {
  return POLOS_ELEITORAIS.find((p) => p.value === value)?.label ?? value;
}

export function labelStatusEleitoral(value: string): string {
  return STATUS_ELEITORAIS.find((s) => s.value === value)?.label ?? value;
}

// ------------------------------------------------------------
// Datas: prazos sao gravados como meia-noite UTC (input YYYY-MM-DD),
// entao a exibicao precisa ser em UTC para nao "voltar um dia" no
// fuso de Recife. Movimentos tem hora real e sao exibidos no fuso local.
// ------------------------------------------------------------

/**
 * Fuso do escritorio. Depois das 21h UTC o "hoje" em UTC ja virou o dia
 * seguinte, entao qualquer nocao de "hoje" precisa passar por aqui — nunca
 * por getUTCDate() do relogio da maquina.
 */
export const TZ_BRASIL = "America/Recife";

/** Data de hoje no fuso de Brasilia/Recife, no formato YYYY-MM-DD. */
export function hojeBrasilYmd(): string {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_BRASIL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Meia-noite UTC do dia de hoje em Brasilia — as datas de prazo sao gravadas
 * assim, entao esta e a referencia correta para comparacoes no banco.
 */
export function inicioDoDiaBrasilUTC(): Date {
  const [ano, mes, dia] = hojeBrasilYmd().split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Ano e mes (0-11) correntes em Brasilia. */
export function anoMesBrasil(): { ano: number; mes: number } {
  const [ano, mes] = hojeBrasilYmd().split("-").map(Number);
  return { ano, mes: mes - 1 };
}

export function formatarDataUTC(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarDataHoraRecife(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Recife",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** YYYY-MM-DD (partes UTC) para preencher <input type="date">. */
export function dataInputUTC(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Dias (inteiros) entre hoje (em Brasilia) e a data do prazo.
 * Negativo = vencido.
 */
export function diasAteUTC(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  const hojeUTC = inicioDoDiaBrasilUTC().getTime();
  const alvoUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.round((alvoUTC - hojeUTC) / 86_400_000);
}
