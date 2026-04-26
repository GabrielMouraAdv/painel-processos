import type { TipoProcesso, TipoProcessoTce } from "@prisma/client";

export type ClassificacaoResultado =
  | "favoravel"
  | "desfavoravel"
  | "parcial"
  | "neutro";

// =================== TCE ===================

export const RESULTADOS_POR_TIPO_TCE: Record<TipoProcessoTce, string[]> = {
  MEDIDA_CAUTELAR: [
    "Cautelar Deferida",
    "Cautelar Indeferida",
    "Cautelar Parcialmente Deferida",
  ],
  PRESTACAO_CONTAS_GOVERNO: [
    "Parecer Previo pela Aprovacao",
    "Parecer Previo pela Aprovacao com Ressalvas",
    "Parecer Previo pela Rejeicao",
  ],
  PRESTACAO_CONTAS_GESTAO: [
    "Contas Regulares",
    "Contas Regulares com Ressalvas",
    "Contas Irregulares",
    "Contas Iliquidaveis",
  ],
  AUDITORIA_ESPECIAL: [
    "Regular",
    "Regular com Ressalvas",
    "Irregular",
    "Arquivamento",
  ],
  TOMADA_CONTAS_ESPECIAL: [
    "Contas Regulares",
    "Contas Regulares com Ressalvas",
    "Contas Irregulares",
    "Contas Iliquidaveis",
  ],
  AUTO_INFRACAO: [
    "Homologado",
    "Nao Homologado",
    "Parcialmente Homologado",
  ],
  RGF: ["Regular", "Irregular"],
  DENUNCIA: [
    "Procedente",
    "Improcedente",
    "Parcialmente Procedente",
    "Arquivamento",
  ],
  DESTAQUE: ["Procedente", "Improcedente"],
  CONSULTA: ["Respondida"],
  PEDIDO_RESCISAO: ["Deferido", "Indeferido"],
  TERMO_AJUSTE_GESTAO: ["Cumprido", "Descumprido", "Em Andamento"],
};

export const PENALIDADES_TCE: string[] = [
  "Sem Penalidade",
  "Multa",
  "Devolucao ao Erario",
  "Multa + Devolucao ao Erario",
  "Declaracao de Inidoneidade",
  "Multa + Declaracao de Inidoneidade",
];

// Resultados que indicam irregularidade/rejeicao (mostram select de penalidade)
const TCE_RESULTADOS_COM_PENALIDADE = new Set<string>([
  "Cautelar Deferida",
  "Cautelar Parcialmente Deferida",
  "Parecer Previo pela Aprovacao com Ressalvas",
  "Parecer Previo pela Rejeicao",
  "Contas Regulares com Ressalvas",
  "Contas Irregulares",
  "Contas Iliquidaveis",
  "Regular com Ressalvas",
  "Irregular",
  "Homologado",
  "Parcialmente Homologado",
  "Procedente",
  "Parcialmente Procedente",
  "Deferido",
  "Descumprido",
]);

export function tceTemPenalidade(resultado: string | null | undefined): boolean {
  return !!resultado && TCE_RESULTADOS_COM_PENALIDADE.has(resultado);
}

// Classificacao por tipo+resultado — perspectiva do escritorio (defesa)
export function classificarResultadoTce(
  tipo: TipoProcessoTce,
  resultado: string | null | undefined,
): ClassificacaoResultado {
  if (!resultado) return "neutro";

  // Resultados parciais (amarelo)
  if (
    /com ressalvas|parcialmente|parcialmente procedente|em andamento/i.test(
      resultado,
    )
  ) {
    return "parcial";
  }

  // Em DENUNCIA / DESTAQUE: o cliente eh acusado, "Improcedente" eh favoravel
  if (tipo === "DENUNCIA" || tipo === "DESTAQUE") {
    if (/improcedente|arquivamento/i.test(resultado)) return "favoravel";
    if (/procedente/i.test(resultado)) return "desfavoravel";
  }

  // Em CAUTELAR: assumindo cautelar contra o cliente, indeferida eh favoravel
  if (tipo === "MEDIDA_CAUTELAR") {
    if (/indeferida/i.test(resultado)) return "favoravel";
    if (/deferida/i.test(resultado)) return "desfavoravel";
  }

  // AUTO_INFRACAO: "Homologado" significa que o auto foi mantido (ruim para o cliente)
  if (tipo === "AUTO_INFRACAO") {
    if (/nao homologado/i.test(resultado)) return "favoravel";
    if (/homologado/i.test(resultado)) return "desfavoravel";
  }

  // PEDIDO_RESCISAO: assumindo pedido feito pelo cliente
  if (tipo === "PEDIDO_RESCISAO") {
    if (/deferido/i.test(resultado) && !/indeferido/i.test(resultado))
      return "favoravel";
    if (/indeferido/i.test(resultado)) return "desfavoravel";
  }

  // TERMO_AJUSTE_GESTAO
  if (tipo === "TERMO_AJUSTE_GESTAO") {
    if (/cumprido/i.test(resultado) && !/descumprido/i.test(resultado))
      return "favoravel";
    if (/descumprido/i.test(resultado)) return "desfavoravel";
  }

  // CONSULTA — apenas "Respondida" — neutro/positivo
  if (tipo === "CONSULTA") return "neutro";

  // Casos gerais (Prestacao de Contas, Auditoria, RGF, TCE):
  if (/regulares|^regular$|aprovacao|arquivamento/i.test(resultado))
    return "favoravel";
  if (/irregular|iliquid|rejeicao/i.test(resultado)) return "desfavoravel";

  return "neutro";
}

// =================== JUDICIAL ===================

const RESULTADOS_JUD_PADRAO = [
  "Procedente",
  "Improcedente",
  "Parcialmente Procedente",
  "Extinta sem Merito",
  "Acordo",
];

export const RESULTADOS_POR_TIPO_JUD: Record<TipoProcesso, string[]> = {
  IMPROBIDADE: [
    "Procedente",
    "Improcedente",
    "Parcialmente Procedente",
    "Extinta sem Merito",
    "Acordo de Nao Persecucao",
  ],
  ACP: [
    "Procedente",
    "Improcedente",
    "Parcialmente Procedente",
    "Extinta sem Merito",
    "Acordo",
  ],
  CRIMINAL: [
    "Condenacao",
    "Absolvicao",
    "Extincao da Punibilidade",
    "Prescricao",
  ],
  MANDADO_SEGURANCA: [
    "Seguranca Concedida",
    "Seguranca Denegada",
    "Extinto sem Merito",
  ],
  MANDADO_SEGURANCA_COLETIVO: [
    "Seguranca Concedida",
    "Seguranca Denegada",
    "Extinto sem Merito",
  ],
  ACAO_POPULAR: ["Procedente", "Improcedente", "Extinta sem Merito"],
  HABEAS_CORPUS: [
    "Concedida a Ordem",
    "Denegada a Ordem",
    "Extinto sem Merito",
  ],
  HABEAS_DATA: ["Procedente", "Improcedente", "Extinta sem Merito"],
  ACAO_RESCISORIA: RESULTADOS_JUD_PADRAO,
  EXECUCAO_FISCAL: RESULTADOS_JUD_PADRAO,
  EXECUCAO_TITULO_EXTRAJUDICIAL: RESULTADOS_JUD_PADRAO,
  CUMPRIMENTO_SENTENCA: RESULTADOS_JUD_PADRAO,
  ACAO_ORDINARIA: RESULTADOS_JUD_PADRAO,
  ACAO_DECLARATORIA: RESULTADOS_JUD_PADRAO,
  ACAO_ANULATORIA: RESULTADOS_JUD_PADRAO,
  EMBARGOS_EXECUCAO: RESULTADOS_JUD_PADRAO,
  EMBARGOS_TERCEIRO: RESULTADOS_JUD_PADRAO,
  RECLAMACAO: RESULTADOS_JUD_PADRAO,
  CONFLITO_COMPETENCIA: RESULTADOS_JUD_PADRAO,
  MEDIDA_CAUTELAR: RESULTADOS_JUD_PADRAO,
  TUTELA_CAUTELAR_ANTECEDENTE: RESULTADOS_JUD_PADRAO,
  PROCEDIMENTO_COMUM: RESULTADOS_JUD_PADRAO,
  JUIZADO_ESPECIAL: RESULTADOS_JUD_PADRAO,
  OUTRO: RESULTADOS_JUD_PADRAO,
};

export const PENALIDADES_JUD: string[] = [
  "Sem Condenacao",
  "Condenacao Pecuniaria",
  "Perda de Cargo",
  "Suspensao de Direitos Politicos",
  "Condenacao Pecuniaria + Perda de Cargo",
  "Condenacao Pecuniaria + Suspensao de Direitos Politicos",
  "Pena Privativa de Liberdade",
];

const JUD_RESULTADOS_COM_PENALIDADE = new Set<string>([
  "Procedente",
  "Parcialmente Procedente",
  "Condenacao",
  "Seguranca Denegada",
  "Denegada a Ordem",
]);

export function judTemPenalidade(resultado: string | null | undefined): boolean {
  return !!resultado && JUD_RESULTADOS_COM_PENALIDADE.has(resultado);
}

export function classificarResultadoJud(
  tipo: TipoProcesso,
  resultado: string | null | undefined,
): ClassificacaoResultado {
  if (!resultado) return "neutro";

  if (/parcialmente|com ressalvas/i.test(resultado)) return "parcial";

  // CRIMINAL: o cliente e reu
  if (tipo === "CRIMINAL") {
    if (/absolvicao|extincao|prescricao/i.test(resultado)) return "favoravel";
    if (/condenacao/i.test(resultado)) return "desfavoravel";
  }

  // MANDADO_SEGURANCA / HABEAS: cliente e impetrante; "Concedida" e favoravel
  if (
    tipo === "MANDADO_SEGURANCA" ||
    tipo === "MANDADO_SEGURANCA_COLETIVO" ||
    tipo === "HABEAS_CORPUS" ||
    tipo === "HABEAS_DATA"
  ) {
    if (/concedida|^procedente$/i.test(resultado)) return "favoravel";
    if (/denegada|denegada a ordem|^improcedente$/i.test(resultado))
      return "desfavoravel";
    if (/extinto|extinta/i.test(resultado)) return "neutro";
  }

  // Casos onde o escritorio defende contra acusacao (improbidade, ACP, popular, etc.)
  if (/^improcedente$/i.test(resultado)) return "favoravel";
  if (/^procedente$/i.test(resultado)) return "desfavoravel";
  if (/extinto sem merito|extinta sem merito|prescricao/i.test(resultado))
    return "favoravel";
  if (/acordo/i.test(resultado)) return "parcial";

  return "neutro";
}

// =================== Helpers compartilhados ===================

export function classeBadgeResultado(c: ClassificacaoResultado): string {
  switch (c) {
    case "favoravel":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "desfavoravel":
      return "bg-red-100 text-red-800 border-red-300";
    case "parcial":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "neutro":
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

export function classeBadgeNaoJulgado(): string {
  return "bg-slate-50 text-slate-500 border-slate-200";
}
