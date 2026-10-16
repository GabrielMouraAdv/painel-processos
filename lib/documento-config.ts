export type TipoDocumento = { key: string; label: string };

export const TIPOS_DOCUMENTO_JUDICIAL: TipoDocumento[] = [
  { key: "peticao_inicial", label: "Petição Inicial" },
  { key: "contestacao", label: "Contestação" },
  { key: "replica", label: "Replica" },
  { key: "sentenca", label: "Sentença" },
  { key: "acordao", label: "Acórdão" },
  { key: "decisao_interlocutoria", label: "Decisão Interlocutória" },
  { key: "parecer_mp", label: "Parecer MP" },
  { key: "laudo_pericial", label: "Laudo Pericial" },
  { key: "procuracao", label: "Procuração" },
  { key: "substabelecimento", label: "Substabelecimento" },
  { key: "outro", label: "Outro" },
];

export const TIPOS_DOCUMENTO_TCE: TipoDocumento[] = [
  { key: "defesa_previa", label: "Defesa Prévia" },
  { key: "manifestacao_previa", label: "Manifestação Prévia" },
  { key: "acordao", label: "Acórdão" },
  { key: "embargos_declaracao", label: "Embargos de Declaração" },
  { key: "recurso_ordinario", label: "Recurso Ordinário" },
  { key: "nota_tecnica", label: "Nota Técnica" },
  { key: "parecer_mpco", label: "Parecer MPCO" },
  { key: "memorial", label: "Memorial" },
  { key: "contrarrazoes", label: "Contrarrazões" },
  { key: "procuracao", label: "Procuração" },
  { key: "outro", label: "Outro" },
];
