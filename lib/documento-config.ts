export type TipoDocumento = { key: string; label: string };

export const TIPOS_DOCUMENTO_JUDICIAL: TipoDocumento[] = [
  { key: "peticao_inicial", label: "Peticao Inicial" },
  { key: "contestacao", label: "Contestacao" },
  { key: "replica", label: "Replica" },
  { key: "sentenca", label: "Sentenca" },
  { key: "acordao", label: "Acordao" },
  { key: "decisao_interlocutoria", label: "Decisao Interlocutoria" },
  { key: "parecer_mp", label: "Parecer MP" },
  { key: "laudo_pericial", label: "Laudo Pericial" },
  { key: "procuracao", label: "Procuracao" },
  { key: "substabelecimento", label: "Substabelecimento" },
  { key: "outro", label: "Outro" },
];

export const TIPOS_DOCUMENTO_TCE: TipoDocumento[] = [
  { key: "defesa_previa", label: "Defesa Previa" },
  { key: "manifestacao_previa", label: "Manifestacao Previa" },
  { key: "acordao", label: "Acordao" },
  { key: "embargos_declaracao", label: "Embargos de Declaracao" },
  { key: "recurso_ordinario", label: "Recurso Ordinario" },
  { key: "nota_tecnica", label: "Nota Tecnica" },
  { key: "parecer_mpco", label: "Parecer MPCO" },
  { key: "memorial", label: "Memorial" },
  { key: "contrarrazoes", label: "Contrarrazoes" },
  { key: "procuracao", label: "Procuracao" },
  { key: "outro", label: "Outro" },
];
