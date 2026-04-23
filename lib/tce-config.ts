import { CamaraTce, TipoProcessoTce } from "@prisma/client";

export type CamaraConfig = {
  label: string;
  titulares: string[];
  presidente?: string;
};

export const TCE_CAMARAS: Record<CamaraTce, CamaraConfig> = {
  PRIMEIRA: {
    label: "Primeira Camara",
    titulares: ["Ranilson Ramos", "Rodrigo Novaes", "Dirceu Rodolfo"],
  },
  SEGUNDA: {
    label: "Segunda Camara",
    titulares: ["Eduardo Porto", "Marcos Loreto", "Valdecir Pascoal"],
  },
  PLENO: {
    label: "Pleno",
    presidente: "Carlos Neves",
    titulares: [
      "Carlos Neves",
      "Ranilson Ramos",
      "Rodrigo Novaes",
      "Dirceu Rodolfo",
      "Eduardo Porto",
      "Marcos Loreto",
      "Valdecir Pascoal",
    ],
  },
};

export const CONSELHEIROS_SUBSTITUTOS: string[] = [
  "Marcos Flavio",
  "Alda Magalhaes",
  "Luiz Arcoverde",
  "Carlos Pimentel",
  "Ricardo Rios",
  "Ruy Harten",
  "Marcos Nobrega",
  "Carlos Mauricio",
  "Adriano Cisneiros",
];

export const TCE_TIPO_LABELS: Record<TipoProcessoTce, string> = {
  PRESTACAO_CONTAS_GOVERNO: "Prestacao de Contas de Governo",
  PRESTACAO_CONTAS_GESTAO: "Prestacao de Contas de Gestao",
  AUDITORIA_ESPECIAL: "Auditoria Especial",
  RGF: "Relatorio de Gestao Fiscal (RGF)",
  AUTO_INFRACAO: "Auto de Infracao",
  MEDIDA_CAUTELAR: "Medida Cautelar",
};

export const TCE_CAMARA_LABELS: Record<CamaraTce, string> = {
  PRIMEIRA: "Primeira Camara",
  SEGUNDA: "Segunda Camara",
  PLENO: "Pleno",
};

export type PrazoAutomatico = {
  tipo: string;
  diasUteis: number;
  prorrogavel: boolean;
};

export type FaseTce = {
  key: string;
  label: string;
  prazo?: PrazoAutomatico;
};

export const FLUXO_PADRAO: FaseTce[] = [
  {
    key: "defesa_previa",
    label: "Aguardando Defesa Previa",
    prazo: { tipo: "Defesa Previa", diasUteis: 30, prorrogavel: true },
  },
  { key: "defesa_apresentada", label: "Defesa Apresentada" },
  {
    key: "acordao_1",
    label: "Acordao publicado",
    prazo: {
      tipo: "Embargos de Declaracao / Recurso Ordinario",
      diasUteis: 30,
      prorrogavel: false,
    },
  },
  { key: "embargos_1", label: "Embargos de Declaracao interpostos" },
  {
    key: "acordao_embargos_1",
    label: "Acordao dos Embargos",
    prazo: {
      tipo: "Recurso Ordinario",
      diasUteis: 30,
      prorrogavel: false,
    },
  },
  { key: "recurso_ordinario", label: "Recurso Ordinario interposto" },
  {
    key: "acordao_ro",
    label: "Acordao do Recurso Ordinario",
    prazo: {
      tipo: "Embargos de Declaracao",
      diasUteis: 30,
      prorrogavel: false,
    },
  },
  { key: "embargos_ro", label: "Embargos de Declaracao apos RO" },
  { key: "acordao_embargos_ro", label: "Acordao dos Embargos pos RO" },
  { key: "transitado", label: "Transitado em Julgado" },
];

export const FLUXO_CAUTELAR: FaseTce[] = [
  {
    key: "manifestacao_previa",
    label: "Aguardando Manifestacao Previa",
    prazo: { tipo: "Manifestacao Previa", diasUteis: 5, prorrogavel: false },
  },
  { key: "manifestacao_apresentada", label: "Manifestacao Apresentada" },
  { key: "decisao_monocratica", label: "Decisao Monocratica proferida" },
  { key: "referendo_pleno", label: "Em Referendo do Pleno" },
  {
    key: "decisao_referendo",
    label: "Decisao do Referendo",
    prazo: { tipo: "Agravo Regimental", diasUteis: 15, prorrogavel: false },
  },
  { key: "agravo_regimental", label: "Agravo Regimental interposto" },
  {
    key: "acordao_agravo",
    label: "Acordao do Agravo",
    prazo: { tipo: "Embargos de Declaracao", diasUteis: 10, prorrogavel: false },
  },
  { key: "embargos_cautelar", label: "Embargos de Declaracao" },
  { key: "acordao_embargos_cautelar", label: "Acordao dos Embargos" },
  { key: "transitado_cautelar", label: "Transitado em Julgado" },
];

export function fasesDoTipo(tipo: TipoProcessoTce): FaseTce[] {
  return tipo === "MEDIDA_CAUTELAR" ? FLUXO_CAUTELAR : FLUXO_PADRAO;
}

export function faseTceLabel(tipo: TipoProcessoTce, key: string): string {
  return fasesDoTipo(tipo).find((f) => f.key === key)?.label ?? key;
}

export function prazoAutomaticoDaFase(
  tipo: TipoProcessoTce,
  key: string,
): PrazoAutomatico | undefined {
  return fasesDoTipo(tipo).find((f) => f.key === key)?.prazo;
}

export function todasFasesTce(): FaseTce[] {
  const map = new Map<string, FaseTce>();
  for (const f of [...FLUXO_PADRAO, ...FLUXO_CAUTELAR]) {
    if (!map.has(f.key)) map.set(f.key, f);
  }
  return Array.from(map.values());
}
