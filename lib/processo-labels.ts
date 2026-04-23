import { Grau, Risco, TipoProcesso, Tribunal } from "@prisma/client";

export const tipoLabels: Record<TipoProcesso, string> = {
  IMPROBIDADE: "Improbidade",
  ACP: "ACP",
  CRIMINAL: "Criminal",
};

export const riscoLabels: Record<Risco, string> = {
  ALTO: "Alto",
  MEDIO: "Medio",
  BAIXO: "Baixo",
};

export const tribunalLabels: Record<Tribunal, string> = {
  TJPE: "TJPE",
  TRF5: "TRF5",
  TRF1: "TRF1",
  STJ: "STJ",
  STF: "STF",
  OUTRO: "Outro",
};

export const grauLabels: Record<Grau, string> = {
  PRIMEIRO: "1o Grau",
  SEGUNDO: "2o Grau",
  SUPERIOR: "Superiores",
};

const faseMap: Record<string, string> = {
  contestacao_apresentada: "Contestacao apresentada",
  aguardando_contestacao: "Aguardando contestacao",
  recurso_interposto: "Recurso interposto",
  contrarrazoes_apres: "Contrarrazoes apresentadas",
  prazo_provas: "Prazo de provas",
  admissibilidade: "Juizo de admissibilidade",
  admissibilidade_sup: "Admissibilidade (superior)",
  audiencia_agendada: "Audiencia agendada",
  sentenca: "Sentenca",
  julgamento_ed: "Julgamento de ED (2o grau)",
  julgamento_ed_2grau: "Julgamento de ED (2o grau)",
  ag_alegacoes_finais: "Aguardando alegacoes finais",
  julgamento_superior: "Julgamento superior",
  pauta_julgamento: "Pauta de julgamento",
  julgamento: "Julgamento (2o grau)",
  julgamento_2grau: "Julgamento (2o grau)",
  alegacoes_finais_apres: "Alegacoes finais apresentadas",
  concluso_julgamento: "Concluso para julgamento",
  transitado: "Transitado em julgado",
};

export function faseLabel(fase: string): string {
  return faseMap[fase] ?? fase;
}

export const fasesEmPauta = [
  "pauta_julgamento",
  "julgamento",
  "julgamento_2grau",
  "julgamento_superior",
  "julgamento_ed",
  "julgamento_ed_2grau",
  "concluso_julgamento",
];
