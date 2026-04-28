// Helpers do modulo financeiro: status de notas, geracao automatica e permissoes.
// Status nao e armazenado no banco — calculado em runtime a partir de pago + dataVencimento.

import { Role, StatusNota } from "@prisma/client";

const FINANCEIRO_BANCAS_AUTORIZADAS = new Set([
  "filipe-campos",
  "porto-rodrigues",
]);

export function podeAcessarFinanceiro(
  role: Role,
  bancaSlug: string | null,
): boolean {
  if (role === Role.ADMIN) return true;
  if (bancaSlug && FINANCEIRO_BANCAS_AUTORIZADAS.has(bancaSlug)) return true;
  return false;
}

// ---------- Status de nota ----------
export type NotaParaStatus = {
  pago: boolean;
  dataVencimento: Date;
};

export function computeStatusNota(
  nota: NotaParaStatus,
  hoje: Date = new Date(),
): StatusNota {
  if (nota.pago) return StatusNota.PAGA;
  const ref = stripTime(hoje);
  const venc = stripTime(nota.dataVencimento);
  if (venc.getTime() >= ref.getTime()) return StatusNota.A_VENCER;
  return StatusNota.VENCIDA;
}

export function diasEmAtraso(
  dataVencimento: Date,
  hoje: Date = new Date(),
): number {
  const venc = stripTime(dataVencimento);
  const ref = stripTime(hoje);
  if (venc.getTime() >= ref.getTime()) return 0;
  const diffMs = ref.getTime() - venc.getTime();
  return Math.floor(diffMs / 86_400_000);
}

function stripTime(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

// ---------- Geracao automatica de notas ----------
export type NotaParaGerar = {
  mesReferencia: number; // 1-12
  anoReferencia: number;
  valorNota: number;
  dataVencimento: Date;
};

// Gera notas mensais desde o mes de dataInicio ate o menor entre dataFim
// (se houver) e dezembro do ano corrente. Vencimento dia 10 do mes seguinte.
// Valor = valorMensal.
export function gerarNotasDoContrato(
  dataInicio: Date,
  dataFim: Date | null,
  valorMensal: number,
  hoje: Date = new Date(),
): NotaParaGerar[] {
  const notas: NotaParaGerar[] = [];

  // Mes inicial: mes/ano de dataInicio (UTC)
  const inicio = new Date(
    Date.UTC(dataInicio.getUTCFullYear(), dataInicio.getUTCMonth(), 1),
  );
  // Mes final: min(dataFim, dezembro do ano corrente)
  const fimAnoCorrente = new Date(Date.UTC(hoje.getUTCFullYear(), 11, 1));
  const fim = dataFim
    ? new Date(Date.UTC(dataFim.getUTCFullYear(), dataFim.getUTCMonth(), 1))
    : fimAnoCorrente;
  const fimEfetivo =
    fim.getTime() < fimAnoCorrente.getTime() ? fim : fimAnoCorrente;

  let cursor = new Date(inicio);
  while (cursor.getTime() <= fimEfetivo.getTime()) {
    const mes = cursor.getUTCMonth() + 1; // 1-12
    const ano = cursor.getUTCFullYear();
    // Vencimento: dia 10 do mes seguinte
    const vencMes = mes === 12 ? 1 : mes + 1;
    const vencAno = mes === 12 ? ano + 1 : ano;
    const dataVencimento = new Date(Date.UTC(vencAno, vencMes - 1, 10));

    notas.push({
      mesReferencia: mes,
      anoReferencia: ano,
      valorNota: valorMensal,
      dataVencimento,
    });

    cursor = new Date(Date.UTC(ano, mes, 1)); // proximo mes
  }
  return notas;
}

// ---------- Formatadores ----------
export function formatBRL(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export const NOMES_MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export const NOMES_MESES_COMPLETO = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const ANOS_DISPONIVEIS = [
  2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030,
];

export const TIPO_HONORARIO_LABELS = {
  CONTRATUAL_MENSAL: "Contratual Mensal",
  POR_CAUSA: "Por Causa",
  SUCUMBENCIA: "Sucumbencia",
  OUTROS: "Outros",
} as const;

export const STATUS_NOTA_LABELS = {
  A_VENCER: "A Vencer",
  PAGA: "Paga",
  VENCIDA: "Vencida",
  EM_ATRASO: "Em Atraso",
} as const;

// Classes Tailwind por status (cores das caixinhas mensais)
export function statusBgClass(status: StatusNota | "SEM_NOTA"): string {
  switch (status) {
    case StatusNota.PAGA:
      return "bg-emerald-500 text-white hover:bg-emerald-600";
    case StatusNota.A_VENCER:
      return "bg-amber-400 text-amber-950 hover:bg-amber-500";
    case StatusNota.VENCIDA:
    case StatusNota.EM_ATRASO:
      return "bg-red-500 text-white hover:bg-red-600";
    case "SEM_NOTA":
    default:
      return "bg-slate-200 text-slate-500 hover:bg-slate-300";
  }
}

export function statusBadgeClass(status: StatusNota): string {
  switch (status) {
    case StatusNota.PAGA:
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
    case StatusNota.A_VENCER:
      return "bg-amber-100 text-amber-900 ring-amber-200";
    case StatusNota.VENCIDA:
    case StatusNota.EM_ATRASO:
      return "bg-red-100 text-red-800 ring-red-200";
  }
}
