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

/** Dias (inteiros) entre hoje e a data do prazo, em UTC. Negativo = vencido. */
export function diasAteUTC(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  const agora = new Date();
  const hojeUTC = Date.UTC(
    agora.getUTCFullYear(),
    agora.getUTCMonth(),
    agora.getUTCDate(),
  );
  const alvoUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return Math.round((alvoUTC - hojeUTC) / 86_400_000);
}
