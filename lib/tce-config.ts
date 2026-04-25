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
  TOMADA_CONTAS_ESPECIAL: "Tomada de Contas Especial",
  DESTAQUE: "Destaque",
  DENUNCIA: "Denuncia",
  TERMO_AJUSTE_GESTAO: "Termo de Ajuste de Gestao",
  PEDIDO_RESCISAO: "Pedido de Rescisao",
  CONSULTA: "Consulta",
};

// Configuracao de prazos automaticos por tipo de processo TCE.
// Baseada na legislacao do TCE-PE.
export type PrazoDefesaConfig = {
  tipo: string; // descricao do prazo (ex: "Defesa Previa")
  diasUteis: number;
  prorrogavel: boolean;
  diasProrrogacao?: number; // quando aplicavel
  observacao?: string; // notas para UI (ex: "criterio do relator")
};

export const PRAZOS_AUTOMATICOS: Partial<
  Record<TipoProcessoTce, PrazoDefesaConfig>
> = {
  PRESTACAO_CONTAS_GOVERNO: {
    tipo: "Defesa Previa",
    diasUteis: 30,
    prorrogavel: true,
    diasProrrogacao: 30,
  },
  PRESTACAO_CONTAS_GESTAO: {
    tipo: "Defesa Previa",
    diasUteis: 30,
    prorrogavel: true,
    diasProrrogacao: 30,
  },
  TOMADA_CONTAS_ESPECIAL: {
    tipo: "Defesa Previa",
    diasUteis: 30,
    prorrogavel: true,
    diasProrrogacao: 30,
  },
  RGF: {
    tipo: "Defesa Previa",
    diasUteis: 5,
    prorrogavel: true,
    observacao: "Prorrogacao a criterio do relator",
  },
  AUDITORIA_ESPECIAL: {
    tipo: "Defesa Previa",
    diasUteis: 30,
    prorrogavel: true,
    diasProrrogacao: 30,
  },
  DESTAQUE: {
    tipo: "Defesa Previa",
    diasUteis: 2,
    prorrogavel: false,
    observacao: "48 horas — improrrogavel",
  },
  DENUNCIA: {
    tipo: "Defesa Previa",
    diasUteis: 30,
    prorrogavel: true,
    diasProrrogacao: 30,
  },
  AUTO_INFRACAO: {
    tipo: "Defesa Previa",
    diasUteis: 5,
    prorrogavel: true,
  },
  MEDIDA_CAUTELAR: {
    tipo: "Manifestacao Previa",
    diasUteis: 5,
    prorrogavel: false,
    observacao: "Improrrogavel",
  },
  // TERMO_AJUSTE_GESTAO, PEDIDO_RESCISAO e CONSULTA nao tem prazo automatico de defesa
};

export function getPrazoDefesaPorTipo(
  tipo: TipoProcessoTce,
): PrazoDefesaConfig | null {
  return PRAZOS_AUTOMATICOS[tipo] ?? null;
}

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
  // Para fases de "defesa previa" / "manifestacao previa", a configuracao
  // por tipo de processo (PRAZOS_AUTOMATICOS) tem prioridade.
  if (key === "defesa_previa" || key === "manifestacao_previa") {
    const cfg = PRAZOS_AUTOMATICOS[tipo];
    if (!cfg) return undefined;
    return {
      tipo: cfg.tipo,
      diasUteis: cfg.diasUteis,
      prorrogavel: cfg.prorrogavel,
    };
  }
  return fasesDoTipo(tipo).find((f) => f.key === key)?.prazo;
}

export function todasFasesTce(): FaseTce[] {
  const map = new Map<string, FaseTce>();
  for (const f of [...FLUXO_PADRAO, ...FLUXO_CAUTELAR]) {
    if (!map.has(f.key)) map.set(f.key, f);
  }
  return Array.from(map.values());
}
