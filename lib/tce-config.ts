import { CamaraTce, TipoProcessoTce, type TipoRecursoTce } from "@prisma/client";

export type CamaraConfig = {
  label: string;
  titulares: string[];
  presidente?: string;
};

export const TCE_CAMARAS: Record<CamaraTce, CamaraConfig> = {
  PRIMEIRA: {
    label: "Primeira Câmara",
    titulares: ["Ranilson Ramos", "Rodrigo Novaes", "Dirceu Rodolfo"],
  },
  SEGUNDA: {
    label: "Segunda Câmara",
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
  PRESTACAO_CONTAS_GOVERNO: "Prestação de Contas de Governo",
  PRESTACAO_CONTAS_GESTAO: "Prestação de Contas de Gestão",
  AUDITORIA_ESPECIAL: "Auditoria Especial",
  RGF: "Relatório de Gestão Fiscal (RGF)",
  AUTO_INFRACAO: "Auto de Infracao",
  MEDIDA_CAUTELAR: "Medida Cautelar",
  TOMADA_CONTAS_ESPECIAL: "Tomada de Contas Especial",
  DESTAQUE: "Destaque",
  DENUNCIA: "Denuncia",
  TERMO_AJUSTE_GESTAO: "Termo de Ajuste de Gestão",
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
  PRIMEIRA: "Primeira Câmara",
  SEGUNDA: "Segunda Câmara",
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
    label: "Aguardando Defesa Prévia",
    prazo: { tipo: "Defesa Previa", diasUteis: 30, prorrogavel: true },
  },
  { key: "defesa_apresentada", label: "Defesa Apresentada" },
  {
    key: "acordao_1",
    label: "Acórdão publicado",
    prazo: {
      tipo: "Embargos de Declaracao / Recurso Ordinario",
      diasUteis: 30,
      prorrogavel: false,
    },
  },
  { key: "embargos_1", label: "Embargos de Declaração interpostos" },
  {
    key: "acordao_embargos_1",
    label: "Acórdão dos Embargos",
    prazo: {
      tipo: "Recurso Ordinario",
      diasUteis: 30,
      prorrogavel: false,
    },
  },
  { key: "recurso_ordinario", label: "Recurso Ordinário interposto" },
  {
    key: "acordao_ro",
    label: "Acórdão do Recurso Ordinário",
    prazo: {
      tipo: "Embargos de Declaracao",
      diasUteis: 30,
      prorrogavel: false,
    },
  },
  { key: "embargos_ro", label: "Embargos de Declaração após RO" },
  { key: "acordao_embargos_ro", label: "Acórdão dos Embargos pos RO" },
  { key: "transitado", label: "Transitado em Julgado" },
];

export const FLUXO_CAUTELAR: FaseTce[] = [
  {
    key: "manifestacao_previa",
    label: "Aguardando Manifestação Prévia",
    prazo: { tipo: "Manifestacao Previa", diasUteis: 5, prorrogavel: false },
  },
  { key: "manifestacao_apresentada", label: "Manifestação Apresentada" },
  { key: "decisao_monocratica", label: "Decisão Monocrática proferida" },
  { key: "referendo_pleno", label: "Em Referendo do Pleno" },
  {
    key: "decisao_referendo",
    label: "Decisão do Referendo",
    prazo: { tipo: "Agravo Regimental", diasUteis: 15, prorrogavel: false },
  },
  { key: "agravo_regimental", label: "Agravo Regimental interposto" },
  {
    key: "acordao_agravo",
    label: "Acórdão do Agravo",
    prazo: { tipo: "Embargos de Declaracao", diasUteis: 10, prorrogavel: false },
  },
  { key: "embargos_cautelar", label: "Embargos de Declaração" },
  { key: "acordao_embargos_cautelar", label: "Acórdão dos Embargos" },
  { key: "transitado_cautelar", label: "Transitado em Julgado" },
];

export function fasesDoTipo(tipo: TipoProcessoTce): FaseTce[] {
  return tipo === "MEDIDA_CAUTELAR" ? FLUXO_CAUTELAR : FLUXO_PADRAO;
}

// Fases gravadas pelas importacoes e pelos botoes da ficha, fora dos dois fluxos.
const FASES_EXTRAS: Record<string, string> = {
  em_instrucao: "Em instrução",
  em_admissibilidade: "Em admissibilidade",
  em_julgamento: "Em julgamento",
  julgado: "Julgado",
  julgado_recorrido: "Julgado com recurso",
  arquivado: "Arquivado",
  sobrestado: "Sobrestado",
  recurso_interposto: "Recurso interposto",
  embargos_interpostos: "Embargos interpostos",
  agravo_interposto: "Agravo interposto",
  agravo_regimental_interposto: "Agravo regimental interposto",
  pedido_rescisao_interposto: "Pedido de rescisão interposto",
  pedido_suspensao_interposto: "Pedido de suspensão interposto",
  nota_tecnica: "Nota Técnica registrada",
  parecer_mpco: "Parecer do MPCO registrado",
  contrarrazoes_nt_dispensadas: "Contrarrazões à NT dispensadas",
  contrarrazoes_mpco_dispensadas: "Contrarrazões ao MPCO dispensadas",
  contrarrazoes_nt_dispensa_revertida: "Dispensa de contrarrazões à NT revertida",
  contrarrazoes_mpco_dispensa_revertida: "Dispensa de contrarrazões ao MPCO revertida",
  contrarrazoes_nt: "Contrarrazões à NT apresentadas",
  contrarrazoes_mpco: "Contrarrazões ao MPCO apresentadas",
  julgamento: "Julgamento",
  julgamento_desfeito: "Julgamento desfeito",
};

export function faseTceLabel(tipo: TipoProcessoTce, key: string): string {
  // Fase do outro fluxo (ex.: acordao de recurso em cautelar) tambem tem rotulo;
  // o que sobrar vira texto legivel ("algo_assim" -> "Algo assim").
  return (
    fasesDoTipo(tipo).find((f) => f.key === key)?.label ??
    todasFasesTce().find((f) => f.key === key)?.label ??
    FASES_EXTRAS[key] ??
    (key.charAt(0).toUpperCase() + key.slice(1)).replace(/_/g, " ")
  );
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

// Configuracao dos prazos por tipo de recurso interposto.
export type PrazoRecursoConfig = {
  tipo: string; // descricao do prazo de contrarrazoes
  diasUteis: number;
  prorrogavel: boolean;
  observacao?: string;
};

export const PRAZOS_RECURSOS_TCE: Partial<
  Record<TipoRecursoTce, PrazoRecursoConfig>
> = {
  RECURSO_ORDINARIO: {
    tipo: "Contrarrazoes ao Recurso Ordinario",
    diasUteis: 30,
    prorrogavel: true,
    observacao: "Suspensivo + devolutivo",
  },
  EMBARGOS_DECLARACAO: {
    tipo: "Contrarrazoes aos Embargos de Declaracao",
    diasUteis: 5,
    prorrogavel: false,
    observacao: "Interrompe outros prazos",
  },
  AGRAVO: {
    tipo: "Contrarrazoes ao Agravo",
    diasUteis: 5,
    prorrogavel: false,
    observacao: "Devolutivo",
  },
  AGRAVO_REGIMENTAL: {
    tipo: "Contrarrazoes ao Agravo Regimental",
    diasUteis: 5,
    prorrogavel: false,
  },
  // PEDIDO_RESCISAO_RECURSO e PEDIDO_SUSPENSAO_CAUTELAR nao tem prazo automatico
};

export function getPrazoRecursoPorTipo(
  tipo: TipoRecursoTce,
): PrazoRecursoConfig | null {
  return PRAZOS_RECURSOS_TCE[tipo] ?? null;
}

export const TCE_RECURSO_LABELS: Record<TipoRecursoTce, string> = {
  RECURSO_ORDINARIO: "Recurso Ordinário",
  EMBARGOS_DECLARACAO: "Embargos de Declaração",
  AGRAVO: "Agravo",
  AGRAVO_REGIMENTAL: "Agravo Regimental",
  PEDIDO_RESCISAO_RECURSO: "Pedido de Rescisao",
  PEDIDO_SUSPENSAO_CAUTELAR: "Pedido de Suspensao Cautelar",
};

export const TCE_RECURSO_CODE: Record<TipoRecursoTce, string> = {
  RECURSO_ORDINARIO: "RO",
  EMBARGOS_DECLARACAO: "ED",
  // Sufixos usados pelo e-TCEPE (ex.: 22100291-1AG001, 25100001-1AR002, 23100857-0PS001).
  AGRAVO: "AG",
  AGRAVO_REGIMENTAL: "AR",
  PEDIDO_RESCISAO_RECURSO: "PR",
  PEDIDO_SUSPENSAO_CAUTELAR: "PS",
};

// Fases iniciais por tipo de recurso (apos interposicao)
export const TCE_RECURSO_FASE_INICIAL: Record<TipoRecursoTce, string> = {
  RECURSO_ORDINARIO: "recurso_interposto",
  EMBARGOS_DECLARACAO: "embargos_interpostos",
  AGRAVO: "agravo_interposto",
  AGRAVO_REGIMENTAL: "agravo_regimental_interposto",
  PEDIDO_RESCISAO_RECURSO: "pedido_rescisao_interposto",
  PEDIDO_SUSPENSAO_CAUTELAR: "pedido_suspensao_interposto",
};
