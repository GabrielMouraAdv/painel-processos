// Helpers do modulo financeiro: status de notas, geracao automatica e permissoes.
// Status nao e armazenado no banco — calculado em runtime a partir de pago + dataVencimento.
//
// IMPORTANTE: NAO importamos `StatusNota` do `@prisma/client` aqui.
// O enum runtime do Prisma nao e confiavel em client components (o bundler
// pode entregar objeto vazio em alguns setups, fazendo `StatusNota.VENCIDA`
// virar `undefined.VENCIDA`). Usamos constantes locais de string ao inves.

import { Role } from "@prisma/client";

import { isBancaSlug } from "@/lib/bancas";

// ---------- Constantes de status (substitui o enum StatusNota do Prisma) ----------
export const STATUS_NOTA = {
  A_VENCER: "A_VENCER",
  PAGA: "PAGA",
  VENCIDA: "VENCIDA",
  EM_ATRASO: "EM_ATRASO",
} as const;

export type StatusNotaT =
  | "A_VENCER"
  | "PAGA"
  | "VENCIDA"
  | "EM_ATRASO";

export function podeAcessarFinanceiro(
  role: Role,
  bancaSlug: string | null,
): boolean {
  if (role === Role.ADMIN) return true;
  if (bancaSlug && isBancaSlug(bancaSlug)) return true;
  return false;
}

// Retorna o recorte de bancas que o usuario logado pode ver no financeiro.
// - ADMIN: null (significa "sem filtro" — ve tudo)
// - Demais com bancaSlug valido: [bancaSlug] (so ve dessa banca)
// - Sem bancaSlug e nao ADMIN: array vazio (nao ve nada)
export function bancasVisiveisFinanceiro(
  role: Role,
  bancaSlug: string | null,
): string[] | null {
  if (role === Role.ADMIN) return null;
  if (bancaSlug && isBancaSlug(bancaSlug)) return [bancaSlug];
  return [];
}

// ---------- Status de nota ----------
export type NotaParaStatus = {
  pago: boolean;
  dataVencimento: Date;
};

export function computeStatusNota(
  nota: NotaParaStatus,
  hoje: Date = new Date(),
): StatusNotaT {
  if (nota.pago) return STATUS_NOTA.PAGA;
  const ref = stripTime(hoje);
  const venc = stripTime(nota.dataVencimento);
  if (venc.getTime() >= ref.getTime()) return STATUS_NOTA.A_VENCER;
  return STATUS_NOTA.VENCIDA;
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
// Valor = valorMensal. Inclui guardas contra Date invalido e loop infinito.
export function gerarNotasDoContrato(
  dataInicio: Date,
  dataFim: Date | null,
  valorMensal: number,
  hoje: Date = new Date(),
): NotaParaGerar[] {
  // Guarda 1: data invalida
  if (!(dataInicio instanceof Date) || isNaN(dataInicio.getTime())) {
    console.warn("[gerarNotasDoContrato] dataInicio invalida:", dataInicio);
    return [];
  }
  if (dataFim && (!(dataFim instanceof Date) || isNaN(dataFim.getTime()))) {
    console.warn("[gerarNotasDoContrato] dataFim invalida:", dataFim);
    dataFim = null;
  }
  if (!Number.isFinite(valorMensal) || valorMensal < 0) {
    console.warn("[gerarNotasDoContrato] valorMensal invalido:", valorMensal);
    return [];
  }

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

  // Guarda 2: cursor antes do fim (evita iteracao reversa)
  if (inicio.getTime() > fimEfetivo.getTime()) {
    return [];
  }

  // Guarda 3: limite maximo de 200 iteracoes (~16 anos) para evitar runaway
  const MAX_ITER = 200;
  let cursor = new Date(inicio);
  let i = 0;
  while (cursor.getTime() <= fimEfetivo.getTime() && i < MAX_ITER) {
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
    i++;
  }
  if (i >= MAX_ITER) {
    console.warn(
      "[gerarNotasDoContrato] limite de iteracoes atingido (",
      MAX_ITER,
      ") — pode haver problema com as datas",
    );
  }
  return notas;
}

// ---------- Renovacao ----------

// Gera notas mensais NOVAS desde "ultimoMes/Ano com nota" + 1 ate novaDataFim.
// Util para renovacao do contrato. Se ja existirem notas para todos os meses
// ate novaDataFim, retorna [].
export function gerarNotasIncrementais(
  ultimoMesGerado: { mes: number; ano: number } | null,
  novaDataFim: Date,
  valorMensal: number,
): NotaParaGerar[] {
  if (!Number.isFinite(valorMensal) || valorMensal < 0) return [];
  if (!(novaDataFim instanceof Date) || isNaN(novaDataFim.getTime())) return [];

  const proximoMes = ultimoMesGerado
    ? new Date(
        Date.UTC(
          ultimoMesGerado.ano + (ultimoMesGerado.mes === 12 ? 1 : 0),
          ultimoMesGerado.mes === 12 ? 0 : ultimoMesGerado.mes,
          1,
        ),
      )
    : new Date(Date.UTC(novaDataFim.getUTCFullYear(), 0, 1));

  const fim = new Date(
    Date.UTC(novaDataFim.getUTCFullYear(), novaDataFim.getUTCMonth(), 1),
  );
  if (proximoMes.getTime() > fim.getTime()) return [];

  const notas: NotaParaGerar[] = [];
  const MAX_ITER = 200;
  let cursor = new Date(proximoMes);
  let i = 0;
  while (cursor.getTime() <= fim.getTime() && i < MAX_ITER) {
    const mes = cursor.getUTCMonth() + 1;
    const ano = cursor.getUTCFullYear();
    const vencMes = mes === 12 ? 1 : mes + 1;
    const vencAno = mes === 12 ? ano + 1 : ano;
    notas.push({
      mesReferencia: mes,
      anoReferencia: ano,
      valorNota: valorMensal,
      dataVencimento: new Date(Date.UTC(vencAno, vencMes - 1, 10)),
    });
    cursor = new Date(Date.UTC(ano, mes, 1));
    i++;
  }
  return notas;
}

// Calcula o status de renovacao de um contrato em relacao a hoje.
//   - "OK": sem dataRenovacao, ou ainda esta longe
//   - "PROXIMA": dentro da janela de aviso (diasAvisoRenovacao)
//   - "VENCIDA": dataRenovacao ja passou e contrato continua ativo
export type StatusRenovacao =
  | { tipo: "OK"; diasAteRenovacao: number | null }
  | { tipo: "PROXIMA"; diasAteRenovacao: number }
  | { tipo: "VENCIDA"; diasDesdeVencimento: number };

export function statusRenovacao(
  dataRenovacao: Date | null,
  diasAvisoRenovacao: number,
  ativo: boolean,
  hoje: Date = new Date(),
): StatusRenovacao {
  if (!dataRenovacao) return { tipo: "OK", diasAteRenovacao: null };
  const ref = stripTime(hoje);
  const ren = stripTime(dataRenovacao);
  const diffDias = Math.floor(
    (ren.getTime() - ref.getTime()) / 86_400_000,
  );
  if (diffDias < 0) {
    return ativo
      ? { tipo: "VENCIDA", diasDesdeVencimento: -diffDias }
      : { tipo: "OK", diasAteRenovacao: diffDias };
  }
  if (diffDias <= diasAvisoRenovacao) {
    return { tipo: "PROXIMA", diasAteRenovacao: diffDias };
  }
  return { tipo: "OK", diasAteRenovacao: diffDias };
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

export const OBJETO_CONTRATO_PADRAO =
  "Prestacao de servicos juridicos especializados em direito administrativo, com enfase em assessoria e consultoria em licitacoes, contratos administrativos, controle externo, contas publicas e representacao perante o Tribunal de Contas do Estado de Pernambuco - TCE/PE, abrangendo a defesa em medidas cautelares, auditorias especiais, prestacoes de contas, autos de infracao e demais procedimentos no ambito do TCE/PE, bem como em acoes correlatas no Poder Judiciario.";

export const TIPO_ADITIVO_LABELS = {
  PRORROGACAO: "Prorrogacao de prazo",
  REAJUSTE: "Reajuste de valor",
  ALTERACAO_OBJETO: "Alteracao de objeto",
  ALTERACAO_VALOR: "Alteracao de valor",
  OUTRO: "Outro",
} as const;

export const STATUS_NOTA_LABELS: Record<StatusNotaT, string> = {
  A_VENCER: "A Vencer",
  PAGA: "Paga",
  VENCIDA: "Vencida",
  EM_ATRASO: "Em Atraso",
};

// Classes Tailwind por status (cores das caixinhas mensais).
// Usa fallback "SEM_NOTA" quando status for null/undefined ou desconhecido.
const BG_CLASS_BY_STATUS: Record<StatusNotaT | "SEM_NOTA", string> = {
  PAGA: "bg-emerald-500 text-white hover:bg-emerald-600",
  A_VENCER: "bg-amber-400 text-amber-950 hover:bg-amber-500",
  VENCIDA: "bg-red-500 text-white hover:bg-red-600",
  EM_ATRASO: "bg-red-500 text-white hover:bg-red-600",
  SEM_NOTA: "bg-slate-200 text-slate-500 hover:bg-slate-300",
};

export function statusBgClass(
  status: StatusNotaT | "SEM_NOTA" | null | undefined,
): string {
  if (!status) return BG_CLASS_BY_STATUS.SEM_NOTA;
  return BG_CLASS_BY_STATUS[status] ?? BG_CLASS_BY_STATUS.SEM_NOTA;
}

const BADGE_CLASS_BY_STATUS: Record<StatusNotaT, string> = {
  PAGA: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  A_VENCER: "bg-amber-100 text-amber-900 ring-amber-200",
  VENCIDA: "bg-red-100 text-red-800 ring-red-200",
  EM_ATRASO: "bg-red-100 text-red-800 ring-red-200",
};

export function statusBadgeClass(
  status: StatusNotaT | null | undefined,
): string {
  if (!status) return "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    BADGE_CLASS_BY_STATUS[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"
  );
}
