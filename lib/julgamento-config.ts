import type {
  ResultadoRecursoTce,
  TipoProcesso,
  TipoProcessoTce,
} from "@prisma/client";

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
    "Arquivada / Prejudicada",
  ],
  PRESTACAO_CONTAS_GOVERNO: [
    "Parecer Prévio pela Aprovação",
    "Parecer Prévio pela Aprovação com Ressalvas",
    "Parecer Prévio pela Rejeição",
  ],
  PRESTACAO_CONTAS_GESTAO: [
    "Contas Regulares",
    "Contas Regulares com Ressalvas",
    "Contas Irregulares",
    "Contas Iliquidáveis",
  ],
  AUDITORIA_ESPECIAL: [
    "Regular",
    "Regular com Ressalvas",
    "Irregular",
    "Arquivamento",
    // Admissao de Pessoal (cadastrada como Auditoria Especial)
    "Legal (registro concedido)",
    "Ilegal (registro negado)",
    "Parcialmente Legal",
    // Julgamento que so expede determinacoes/medidas saneadoras (ex.: 25100389-9)
    "Determinações (sem juízo de irregularidade)",
  ],
  TOMADA_CONTAS_ESPECIAL: [
    "Contas Regulares",
    "Contas Regulares com Ressalvas",
    "Contas Irregulares",
    "Contas Iliquidáveis",
  ],
  AUTO_INFRACAO: [
    "Homologado",
    "Não Homologado",
    "Parcialmente Homologado",
  ],
  RGF: ["Regular", "Regular com Ressalvas", "Irregular"],
  DENUNCIA: [
    "Procedente",
    "Improcedente",
    "Parcialmente Procedente",
    "Arquivamento",
  ],
  DESTAQUE: ["Procedente", "Improcedente"],
  CONSULTA: ["Respondida"],
  PEDIDO_RESCISAO: ["Deferido", "Indeferido"],
  TERMO_AJUSTE_GESTAO: [
    "Cumprido",
    "Parcialmente Cumprido",
    "Descumprido",
    "Em Andamento",
  ],
};

// Desfecho proprio do recurso (RO, ED, AG, AR, PS, PR).
// Compara rotulos ignorando acento e maiusculas: os registros antigos foram
// gravados sem acento ("Parecer Previo pela Rejeicao").
export function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Rotulo canonico (da lista oficial) correspondente a um valor gravado, com ou sem acento.
export function rotuloCanonico(lista: string[], valor: string | null | undefined): string | null {
  if (!valor) return null;
  const v = semAcento(valor);
  return lista.find((r) => semAcento(r) === v) ?? null;
}

export const RESULTADO_RECURSO_LABELS: Record<ResultadoRecursoTce, string> = {
  PROVIDO: "Provido",
  PROVIDO_EM_PARTE: "Provido em parte",
  NAO_PROVIDO: "Não provido",
  NAO_CONHECIDO: "Não conhecido",
  PREJUDICADO: "Prejudicado",
};

// Perspectiva da defesa: o recurso e, em regra, do cliente.
export function classificarResultadoRecurso(
  r: ResultadoRecursoTce | null | undefined,
): ClassificacaoResultado {
  if (r === "PROVIDO") return "favoravel";
  if (r === "PROVIDO_EM_PARTE") return "parcial";
  if (r === "NAO_PROVIDO" || r === "NAO_CONHECIDO") return "desfavoravel";
  return "neutro";
}

// Desfecho que mantem o resultado inicial do processo de origem.
export const RECURSO_MANTEM_RESULTADO: ResultadoRecursoTce[] = [
  "NAO_PROVIDO",
  "NAO_CONHECIDO",
  "PREJUDICADO",
];

export const PENALIDADES_TCE: string[] = [
  "Sem Penalidade",
  "Multa",
  "Devolução ao Erário",
  "Multa + Devolução ao Erário",
  "Declaração de Inidoneidade",
  "Multa + Declaração de Inidoneidade",
];

// Resultados que indicam irregularidade/rejeicao (mostram select de penalidade)
const TCE_RESULTADOS_COM_PENALIDADE = new Set<string>([
  "Cautelar Deferida",
  "Cautelar Parcialmente Deferida",
  "Parecer Prévio pela Aprovação com Ressalvas",
  "Parecer Prévio pela Rejeição",
  "Contas Regulares com Ressalvas",
  "Contas Irregulares",
  "Contas Iliquidáveis",
  "Regular com Ressalvas",
  "Irregular",
  "Homologado",
  "Parcialmente Homologado",
  "Procedente",
  "Parcialmente Procedente",
  "Deferido",
  "Descumprido",
  "Parcialmente Cumprido",
  "Ilegal (registro negado)",
  "Parcialmente Legal",
]);

const TCE_COM_PENALIDADE_NORM = new Set(Array.from(TCE_RESULTADOS_COM_PENALIDADE, semAcento));
export function tceTemPenalidade(resultado: string | null | undefined): boolean {
  return !!resultado && TCE_COM_PENALIDADE_NORM.has(semAcento(resultado));
}

// Classificacao por tipo+resultado — perspectiva do escritorio (defesa)
export function classificarResultadoTce(
  tipo: TipoProcessoTce,
  resultadoGravado: string | null | undefined,
): ClassificacaoResultado {
  if (!resultadoGravado) return "neutro";
  // As regras abaixo comparam sem acento.
  const resultado = semAcento(resultadoGravado);

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

  // So determinacoes, sem juizo de regularidade: neutro (antes da regra geral,
  // porque o rotulo contem a palavra "irregularidade").
  if (/^determina/i.test(resultado)) return "neutro";

  // Admissao de Pessoal: legalidade do ato (registro)
  if (/^ilegal/i.test(resultado)) return "desfavoravel";
  if (/^legal/i.test(resultado)) return "favoravel";

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
  "Extinta sem Mérito",
  "Acordo",
];

export const RESULTADOS_POR_TIPO_JUD: Record<TipoProcesso, string[]> = {
  IMPROBIDADE: [
    "Procedente",
    "Improcedente",
    "Parcialmente Procedente",
    "Extinta sem Mérito",
    "Acordo de Não Persecução",
  ],
  ACP: [
    "Procedente",
    "Improcedente",
    "Parcialmente Procedente",
    "Extinta sem Mérito",
    "Acordo",
  ],
  CRIMINAL: [
    "Condenação",
    "Absolvição",
    "Extinção da Punibilidade",
    "Prescrição",
  ],
  MANDADO_SEGURANCA: [
    "Segurança Concedida",
    "Segurança Denegada",
    "Extinto sem Mérito",
  ],
  MANDADO_SEGURANCA_COLETIVO: [
    "Segurança Concedida",
    "Segurança Denegada",
    "Extinto sem Mérito",
  ],
  ACAO_POPULAR: ["Procedente", "Improcedente", "Extinta sem Mérito"],
  HABEAS_CORPUS: [
    "Concedida a Ordem",
    "Denegada a Ordem",
    "Extinto sem Mérito",
  ],
  HABEAS_DATA: ["Procedente", "Improcedente", "Extinta sem Mérito"],
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
  "Sem Condenação",
  "Condenação Pecuniária",
  "Perda de Cargo",
  "Suspensão de Direitos Políticos",
  "Condenação Pecuniária + Perda de Cargo",
  "Condenação Pecuniária + Suspensão de Direitos Políticos",
  "Pena Privativa de Liberdade",
];

const JUD_RESULTADOS_COM_PENALIDADE = new Set<string>([
  "Procedente",
  "Parcialmente Procedente",
  "Condenação",
  "Segurança Denegada",
  "Denegada a Ordem",
]);

const JUD_COM_PENALIDADE_NORM = new Set(Array.from(JUD_RESULTADOS_COM_PENALIDADE, semAcento));
export function judTemPenalidade(resultado: string | null | undefined): boolean {
  return !!resultado && JUD_COM_PENALIDADE_NORM.has(semAcento(resultado));
}

export function classificarResultadoJud(
  tipo: TipoProcesso,
  resultadoGravado: string | null | undefined,
): ClassificacaoResultado {
  if (!resultadoGravado) return "neutro";
  const resultado = semAcento(resultadoGravado);

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
  return "bg-yellow-100 text-yellow-800 border-yellow-300";
}

export function classeBadgeJulgadoSemDetalhe(): string {
  return "bg-blue-100 text-blue-800 border-blue-300";
}
