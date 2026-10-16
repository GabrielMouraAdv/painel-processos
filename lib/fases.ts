import type { Grau } from "@prisma/client";

export type AcaoAutomatica = {
  id: string;
  label: string;
  tipoPrazo: string;
  dias: number;
  observacoes?: string;
};

export type ResultadoOpcao = {
  value: string;
  label: string;
  acoes?: AcaoAutomatica[];
};

export type FaseConfig = {
  value: string;
  label: string;
  alertas?: string[];
  resultados?: ResultadoOpcao[];
};

export const fasesPorGrau: Record<Grau, FaseConfig[]> = {
  PRIMEIRO: [
    { value: "aguardando_contestacao", label: "Aguardando contestação" },
    { value: "contestacao_apresentada", label: "Contestação apresentada" },
    { value: "prazo_provas", label: "Prazo de provas" },
    { value: "audiencia_agendada", label: "Audiencia agendada" },
    { value: "ag_alegacoes_finais", label: "Aguardando alegações finais" },
    { value: "alegacoes_finais_apres", label: "Alegações finais apresentadas" },
    { value: "concluso_julgamento", label: "Concluso para julgamento" },
    {
      value: "sentenca",
      label: "Sentença",
      resultados: [
        {
          value: "procedente",
          label: "Procedente",
          acoes: [
            { id: "embargos_5d", label: "Opor embargos de declaração (5 dias)", tipoPrazo: "Embargos de declaracao", dias: 5 },
            { id: "apelacao_15d", label: "Interpor apelação (15 dias)", tipoPrazo: "Apelacao", dias: 15 },
          ],
        },
        {
          value: "improcedente",
          label: "Improcedente",
          acoes: [
            { id: "aguardar_mppe_15d", label: "Aguardar prazo MPPE (15 dias)", tipoPrazo: "Aguardar recurso MPPE", dias: 15 },
          ],
        },
      ],
    },
  ],

  SEGUNDO: [
    { value: "recurso_interposto", label: "Recurso interposto" },
    { value: "contrarrazoes_apres", label: "Contrarrazões apresentadas" },
    {
      value: "pauta_julgamento",
      label: "Pauta de julgamento",
      alertas: [
        "Preparar memoriais",
        "Agendar despacho com relator",
      ],
    },
    {
      value: "julgamento",
      label: "Julgamento (2o grau)",
      resultados: [
        { value: "favoravel", label: "Favorável" },
        { value: "desfavoravel", label: "Desfavorável" },
      ],
    },
    {
      value: "julgamento_ed",
      label: "Julgamento de ED (2o grau)",
      resultados: [
        {
          value: "favoravel",
          label: "Favorável",
          acoes: [
            { id: "resp_15d", label: "Interpor REsp (15 dias)", tipoPrazo: "Recurso especial (REsp)", dias: 15 },
            { id: "re_15d", label: "Interpor RE (15 dias)", tipoPrazo: "Recurso extraordinario (RE)", dias: 15 },
          ],
        },
        {
          value: "desfavoravel",
          label: "Desfavorável",
          acoes: [
            { id: "resp_15d", label: "Interpor REsp (15 dias)", tipoPrazo: "Recurso especial (REsp)", dias: 15 },
            { id: "re_15d", label: "Interpor RE (15 dias)", tipoPrazo: "Recurso extraordinario (RE)", dias: 15 },
          ],
        },
      ],
    },
    {
      value: "admissibilidade",
      label: "Juízo de admissibilidade",
      resultados: [
        { value: "admitido", label: "Admitido" },
        {
          value: "nao_admitido",
          label: "Não admitido",
          acoes: [
            { id: "agravo_15d", label: "Interpor agravo (15 dias)", tipoPrazo: "Agravo em recurso especial/extraordinario", dias: 15 },
          ],
        },
      ],
    },
  ],

  SUPERIOR: [
    { value: "admissibilidade_sup", label: "Admissibilidade (superior)" },
    { value: "julgamento_superior", label: "Julgamento superior" },
    { value: "transitado", label: "Transitado em julgado" },
  ],
};

export function getFase(grau: Grau, fase: string): FaseConfig | undefined {
  return fasesPorGrau[grau]?.find((f) => f.value === fase);
}

export function getResultado(
  grau: Grau,
  fase: string,
  resultado: string,
): ResultadoOpcao | undefined {
  return getFase(grau, fase)?.resultados?.find((r) => r.value === resultado);
}

export function addDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}
