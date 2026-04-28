// Cadastro dos processos reais do escritorio Porto e Rodrigues. Roda manualmente:
//   npx tsx prisma/seed-real-porto-rodrigues.ts
//
// Pre-requisito: migration `add_bancas_slug` ja aplicada (campo
// `bancasSlug String[]` em ProcessoTce e SubprocessoTce).
//
// NAO altera composicao das camaras nem nada em lib/tce-config.ts.
// Faz lookup do relator dentro da composicao ja cadastrada para inferir camara.

import {
  PrismaClient,
  CamaraTce,
  TipoProcessoTce,
  TipoRecursoTce,
} from "@prisma/client";
import { TCE_CAMARAS } from "../lib/tce-config";

const prisma = new PrismaClient();

const SLUG_FILIPE = "filipe-campos";
const SLUG_PORTO = "porto-rodrigues";

// ---------- Aliases relator ----------
const RELATOR_ALIAS: Record<string, string> = {
  "Dirceu Rodolfo Junior": "Dirceu Rodolfo",
  "Carlos Mauricio Figueiredo": "Carlos Mauricio",
  "Carlos da Costa Pinto Neves Filho": "Carlos Neves",
  "Ruy Ricardo Harten": "Ruy Harten",
  "Marcos Flavio Tenorio de Almeida": "Marcos Flavio",
};

const PRIMEIRA_TITULARES = new Set(TCE_CAMARAS.PRIMEIRA.titulares);
const SEGUNDA_TITULARES = new Set(TCE_CAMARAS.SEGUNDA.titulares);
const PLENO_PRESIDENTE = TCE_CAMARAS.PLENO.presidente ?? "Carlos Neves";

// Relatores que sabidamente NAO estao na composicao (logar ao usar)
const RELATORES_FORA_COMPOSICAO = new Set<string>(["Teresa Duere"]);

function camaraDoRelator(
  relatorRaw: string | null,
  forawarn?: (msg: string) => void,
): CamaraTce {
  if (!relatorRaw) return CamaraTce.PLENO;
  const nomeBase = RELATOR_ALIAS[relatorRaw] ?? relatorRaw;
  if (PRIMEIRA_TITULARES.has(nomeBase)) return CamaraTce.PRIMEIRA;
  if (SEGUNDA_TITULARES.has(nomeBase)) return CamaraTce.SEGUNDA;
  if (nomeBase === PLENO_PRESIDENTE) return CamaraTce.PLENO;
  if (RELATORES_FORA_COMPOSICAO.has(nomeBase) && forawarn) {
    forawarn(
      `Relator "${relatorRaw}" nao esta na composicao cadastrada — usando PLENO como fallback`,
    );
  }
  // Substituto ou desconhecido -> PLENO
  return CamaraTce.PLENO;
}

// ---------- Mapeamento estagio -> faseAtual / julgado ----------
type Estagio =
  | "EM_INSTRUCAO"
  | "EM_JULGAMENTO"
  | "SOBRESTADO"
  | "JULGADO"
  | "JULGADO_RECORRIDO"
  | "ARQUIVADO";

function faseDoEstagio(e: Estagio): { fase: string; julgado: boolean } {
  switch (e) {
    case "EM_INSTRUCAO":
      return { fase: "em_instrucao", julgado: false };
    case "EM_JULGAMENTO":
      return { fase: "em_julgamento", julgado: false };
    case "SOBRESTADO":
      return { fase: "sobrestado", julgado: false };
    case "JULGADO":
      return { fase: "julgado", julgado: true };
    case "JULGADO_RECORRIDO":
      return { fase: "julgado_recorrido", julgado: true };
    case "ARQUIVADO":
      return { fase: "arquivado", julgado: true };
  }
}

// ---------- Municipios e entidades especiais a criar ----------
type MunicipioInput = { nome: string; uf: string; observacoes?: string };

const MUNICIPIOS_NOVOS: MunicipioInput[] = [
  { nome: "Vitoria de Santo Antao", uf: "PE" },
  { nome: "Sao Jose do Egito", uf: "PE" },
  { nome: "Solidao", uf: "PE" },
  { nome: "Salgadinho", uf: "PE" },
  { nome: "Sao Bento do Una", uf: "PE" },
  { nome: "Lagoa dos Gatos", uf: "PE" },
  { nome: "Jatauba", uf: "PE" },
  { nome: "Santa Cruz do Capibaribe", uf: "PE" },
];

const ENTIDADES_ESPECIAIS: MunicipioInput[] = [
  {
    nome: "Fundo Previdenciario Sao Jose do Egito",
    uf: "PE",
    observacoes:
      "Fundo Previdenciario do Municipio de Sao Jose do Egito (Plano Financeiro) - entidade especial",
  },
  {
    nome: "Instituto Previdencia Caruaru",
    uf: "PE",
    observacoes:
      "Instituto de Previdencia dos Servidores de Caruaru - autarquia previdenciaria",
  },
  {
    nome: "Instituto Previdencia Quipapa",
    uf: "PE",
    observacoes:
      "Instituto de Previdencia Social do Municipio de Quipapa - autarquia previdenciaria",
  },
  {
    nome: "Instituto Previdencia Sao Bento do Una",
    uf: "PE",
    observacoes:
      "Instituto de Previdencia dos Servidores Publicos de Sao Bento do Una - autarquia previdenciaria",
  },
  {
    nome: "Consorcio Pajeu",
    uf: "PE",
    observacoes: "Consorcio de Integracao dos Municipios do Pajeu - entidade especial",
  },
  {
    nome: "Fundacao Cultura Caruaru",
    uf: "PE",
    observacoes:
      "Fundacao de Cultura, Turismo e Esporte de Caruaru - fundacao publica",
  },
  {
    nome: "Altinhoprev",
    uf: "PE",
    observacoes:
      "Autarquia Municipal de Previdencia Social de Altinho (Altinhoprev) - autarquia previdenciaria",
  },
  {
    nome: "DER-PE",
    uf: "PE",
    observacoes:
      "Departamento de Estradas de Rodagem do Estado de Pernambuco (DER-PE) - autarquia estadual",
  },
];

// ---------- Processos compartilhados (atualizar bancasSlug) ----------
const PROCESSOS_COMPARTILHADOS = [
  "24101177-2",
  "23100951-3",
  "23100857-0",
  "23100768-1",
  "25100902-6",
  "20100346-6",
  "20100025-8",
];

const SUBPROCESSOS_COMPARTILHADOS = [
  "23100951-3RO001",
  "23100951-3RO002",
  "23100951-3RO003",
];

// ---------- Lista de processos principais novos ----------
type ProcessoInput = {
  numero: string;
  municipio: string;
  tipo: TipoProcessoTce;
  exercicio: string | null;
  relator: string | null;
  estagio: Estagio;
  objetoExtra?: string;
};

const PROCESSOS: ProcessoInput[] = [
  { numero: "PI2600091", municipio: "Cabo de Santo Agostinho", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2026", relator: "Ranilson Ramos", estagio: "EM_INSTRUCAO", objetoExtra: "Fiscalizacao - Auditoria" },
  { numero: "PI2501473", municipio: "Cabo de Santo Agostinho", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2025", relator: "Ranilson Ramos", estagio: "EM_INSTRUCAO", objetoExtra: "Fiscalizacao - Acompanhamento" },
  { numero: "26100309-4", municipio: "Vitoria de Santo Antao", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "26100281-8", municipio: "Salgueiro", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { numero: "26100263-6", municipio: "Caruaru", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Dirceu Rodolfo Junior", estagio: "EM_JULGAMENTO" },
  { numero: "26100258-2", municipio: "Salgueiro", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "JULGADO" },
  { numero: "26100234-0", municipio: "Cabo de Santo Agostinho", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Ranilson Ramos", estagio: "JULGADO" },
  { numero: "26100233-8", municipio: "Cabo de Santo Agostinho", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Ranilson Ramos", estagio: "JULGADO" },
  { numero: "26100232-6", municipio: "Cabo de Santo Agostinho", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Ranilson Ramos", estagio: "JULGADO_RECORRIDO" },
  { numero: "25101838-6", municipio: "Fundo Previdenciario Sao Jose do Egito", tipo: TipoProcessoTce.AUTO_INFRACAO, exercicio: "2025", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { numero: "25101684-5", municipio: "Salgueiro", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2025", relator: "Ricardo Rios", estagio: "JULGADO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "25101629-8", municipio: "Cabo de Santo Agostinho", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024-2025", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "25101528-2", municipio: "Vitoria de Santo Antao", tipo: TipoProcessoTce.AUTO_INFRACAO, exercicio: "2025", relator: "Ranilson Ramos", estagio: "JULGADO_RECORRIDO" },
  { numero: "25101497-6", municipio: "Cabo de Santo Agostinho", tipo: TipoProcessoTce.AUTO_INFRACAO, exercicio: "2025", relator: "Ranilson Ramos", estagio: "JULGADO_RECORRIDO" },
  { numero: "25101435-6", municipio: "Cabo de Santo Agostinho", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2025", relator: "Ranilson Ramos", estagio: "JULGADO_RECORRIDO" },
  { numero: "25101317-0", municipio: "Cabo de Santo Agostinho", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2025", relator: "Ranilson Ramos", estagio: "JULGADO_RECORRIDO" },
  { numero: "25101274-8", municipio: "Instituto Previdencia Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Marcos Nobrega", estagio: "EM_JULGAMENTO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "25101226-8", municipio: "Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024-2025", relator: "Dirceu Rodolfo Junior", estagio: "EM_INSTRUCAO" },
  { numero: "25101170-7", municipio: "Solidao", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2022-2023", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "25101163-0", municipio: "Salgadinho", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2018-2019", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { numero: "25101157-4", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024-2025", relator: "Ranilson Ramos", estagio: "EM_INSTRUCAO" },
  { numero: "25101143-4", municipio: "Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024-2025", relator: "Dirceu Rodolfo Junior", estagio: "JULGADO" },
  { numero: "25101124-0", municipio: "Sao Bento do Una", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2025", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "25101093-4", municipio: "Sao Bento do Una", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "25100780-7", municipio: "Cabo de Santo Agostinho", tipo: TipoProcessoTce.AUTO_INFRACAO, exercicio: "2025", relator: "Ranilson Ramos", estagio: "JULGADO_RECORRIDO" },
  { numero: "25100764-9", municipio: "Vitoria de Santo Antao", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2025", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "25100759-5", municipio: "Lagoa dos Gatos", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Marcos Loreto", estagio: "JULGADO_RECORRIDO" },
  { numero: "25100617-7", municipio: "Caruaru", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2024", relator: "Marcos Loreto", estagio: "JULGADO" },
  { numero: "25100577-0", municipio: "Canhotinho", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2024", relator: "Rodrigo Novaes", estagio: "JULGADO" },
  { numero: "25100556-2", municipio: "Sao Caetano", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2024", relator: "Marcos Loreto", estagio: "EM_INSTRUCAO" },
  { numero: "25100522-7", municipio: "Caruaru", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2025", relator: "Dirceu Rodolfo Junior", estagio: "JULGADO_RECORRIDO" },
  { numero: "25100394-2", municipio: "Instituto Previdencia Quipapa", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2024", relator: "Marcos Loreto", estagio: "JULGADO" },
  { numero: "25100389-9", municipio: "Vitoria de Santo Antao", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024-2025", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "25100315-2", municipio: "Instituto Previdencia Sao Bento do Una", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023-2025", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { numero: "25100296-2", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Carlos Pimentel", estagio: "JULGADO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "25100288-3", municipio: "Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Marcos Nobrega", estagio: "EM_INSTRUCAO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "25100267-6", municipio: "Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Marcos Nobrega", estagio: "JULGADO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "25100266-4", municipio: "Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Marcos Nobrega", estagio: "EM_JULGAMENTO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "25100253-6", municipio: "Consorcio Pajeu", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023-2024", relator: "Dirceu Rodolfo Junior", estagio: "EM_JULGAMENTO" },
  { numero: "25100200-7", municipio: "Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Marcos Nobrega", estagio: "JULGADO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "25100199-4", municipio: "Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Marcos Nobrega", estagio: "EM_JULGAMENTO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "24101338-0", municipio: "Brejo da Madre de Deus", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2024", relator: "Dirceu Rodolfo Junior", estagio: "JULGADO_RECORRIDO" },
  { numero: "24101320-3", municipio: "Sao Bento do Una", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "24101186-3", municipio: "Pedra", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2024", relator: "Marcos Loreto", estagio: "EM_JULGAMENTO" },
  { numero: "24101134-6", municipio: "Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023-2024", relator: "Marcos Loreto", estagio: "JULGADO" },
  { numero: "24100923-6", municipio: "Sao Bento do Una", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "24100805-0", municipio: "Lajedo", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023-2024", relator: "Ranilson Ramos", estagio: "JULGADO_RECORRIDO" },
  { numero: "24100801-3", municipio: "Fundacao Cultura Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023-2024", relator: "Marcos Loreto", estagio: "JULGADO_RECORRIDO" },
  { numero: "24100492-5", municipio: "Sao Bento do Una", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2023", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "24100407-0", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Marcos Flavio Tenorio de Almeida", estagio: "JULGADO_RECORRIDO" },
  { numero: "24100343-0", municipio: "Instituto Previdencia Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2024", relator: "Marcos Loreto", estagio: "EM_JULGAMENTO" },
  { numero: "24100287-4", municipio: "Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023", relator: "Marcos Nobrega", estagio: "JULGADO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "24100123-7", municipio: "Caruaru", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2022-2023", relator: "Marcos Loreto", estagio: "EM_JULGAMENTO" },
  { numero: "24100058-0", municipio: "Altinhoprev", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2019-2021", relator: "Marcos Nobrega", estagio: "EM_JULGAMENTO" },
  { numero: "23101050-3", municipio: "Jatauba", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2017-2020", relator: "Ruy Ricardo Harten", estagio: "JULGADO_RECORRIDO" },
  { numero: "23101016-3", municipio: "Santa Cruz do Capibaribe", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2017-2021", relator: "Marcos Nobrega", estagio: "EM_JULGAMENTO" },
  { numero: "23100578-7", municipio: "Quipapa", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2022", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "23100063-7", municipio: "Santa Cruz do Capibaribe", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2020", relator: "Luiz Arcoverde", estagio: "JULGADO" },
  { numero: "22100785-4", municipio: "Manari", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2017-2019", relator: "Rodrigo Novaes", estagio: "EM_JULGAMENTO" },
  { numero: "22100291-1", municipio: "Manari", tipo: TipoProcessoTce.RGF, exercicio: "2020", relator: "Teresa Duere", estagio: "JULGADO_RECORRIDO" },
  { numero: "21100515-0", municipio: "Manari", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2020", relator: "Teresa Duere", estagio: "ARQUIVADO" },
  { numero: "19100418-2", municipio: "DER-PE", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2019", relator: "Luiz Arcoverde", estagio: "EM_JULGAMENTO" },
];

// ---------- Subprocessos novos ----------
type SubprocessoInput = {
  processoPaiNumero: string;
  sufixo: string;
  tipoRecurso: TipoRecursoTce;
  numeroSequencial: number;
  exercicio: string;
  relator: string;
  estagio: Estagio;
  bancasSlug: string[];
};

const SUBPROCESSOS: SubprocessoInput[] = [
  { processoPaiNumero: "25101528-2", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "25101497-6", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "25101435-6", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "25101435-6", sufixo: "AR001", tipoRecurso: TipoRecursoTce.AGRAVO_REGIMENTAL, numeroSequencial: 1, exercicio: "2025", relator: "Valdecir Pascoal", estagio: "JULGADO_RECORRIDO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "25101317-0", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2026", relator: "Rodrigo Novaes", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "25101317-0", sufixo: "AR001", tipoRecurso: TipoRecursoTce.AGRAVO_REGIMENTAL, numeroSequencial: 1, exercicio: "2025", relator: "Rodrigo Novaes", estagio: "JULGADO_RECORRIDO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "25100759-5", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2026", relator: "Marcos Loreto", estagio: "JULGADO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "25100522-7", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2025", relator: "Dirceu Rodolfo Junior", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "24100805-0", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "24100801-3", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2026", relator: "Rodrigo Novaes", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "24100407-0", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2024", relator: "Marcos Flavio Tenorio de Almeida", estagio: "JULGADO_RECORRIDO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "24100407-0", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2026", relator: "Marcos Flavio Tenorio de Almeida", estagio: "JULGADO", bancasSlug: [SLUG_PORTO] },
  { processoPaiNumero: "23101050-3", sufixo: "RO002", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 2, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PORTO] },
  // Compartilhado (Filipe Campos + Porto e Rodrigues)
  { processoPaiNumero: "23100951-3", sufixo: "RO004", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 4, exercicio: "2026", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_FILIPE, SLUG_PORTO] },
];

// ---------- Execucao ----------
async function main() {
  const erros: string[] = [];
  const avisos: string[] = [];
  const warn = (msg: string) => avisos.push(msg);

  // 0) Identificar escritorio (unico do banco)
  const escritorio = await prisma.escritorio.findFirst({
    select: { id: true, nome: true },
  });
  if (!escritorio) {
    throw new Error("Nenhum escritorio cadastrado. Abortando.");
  }
  console.log(`Escritorio alvo: ${escritorio.nome} (${escritorio.id})`);

  // ---------- ETAPA 1: backfill bancasSlug = [filipe-campos] ----------
  console.log("\n--- ETAPA 1: backfill bancasSlug=[filipe-campos] nos registros ja existentes ---");

  // Backfill apenas registros com bancasSlug vazio (idempotente)
  const procBackfill = await prisma.processoTce.updateMany({
    where: { bancasSlug: { isEmpty: true } },
    data: { bancasSlug: [SLUG_FILIPE] },
  });
  const subBackfill = await prisma.subprocessoTce.updateMany({
    where: { bancasSlug: { isEmpty: true } },
    data: { bancasSlug: [SLUG_FILIPE] },
  });
  console.log(`  ProcessoTce com bancasSlug backfilled: ${procBackfill.count}`);
  console.log(`  SubprocessoTce com bancasSlug backfilled: ${subBackfill.count}`);

  // ---------- ETAPA 2: criar municipios e entidades ----------
  console.log("\n--- ETAPA 2: criando municipios e entidades especiais ---");
  let entidadesCriadas = 0;
  for (const m of [...MUNICIPIOS_NOVOS, ...ENTIDADES_ESPECIAIS]) {
    const ja = await prisma.municipio.findFirst({
      where: { nome: m.nome, escritorioId: escritorio.id },
      select: { id: true },
    });
    if (ja) {
      console.log(`  [skip] ${m.nome}/${m.uf} ja existe`);
      continue;
    }
    await prisma.municipio.create({
      data: {
        nome: m.nome,
        uf: m.uf,
        observacoes: m.observacoes ?? null,
        escritorioId: escritorio.id,
      },
    });
    entidadesCriadas++;
    console.log(`  [criado] ${m.nome}/${m.uf}`);
  }

  // ---------- ETAPA 3: vincular compartilhados ----------
  console.log("\n--- ETAPA 3: atualizando processos compartilhados (FC + PR) ---");
  let compartilhadosAtualizados = 0;
  let subCompartilhadosAtualizados = 0;

  for (const numero of PROCESSOS_COMPARTILHADOS) {
    const found = await prisma.processoTce.findFirst({
      where: { numero },
      select: { id: true, bancasSlug: true },
    });
    if (!found) {
      const erro = `Compartilhado ${numero}: ProcessoTce nao encontrado`;
      console.error(`  [ERRO] ${erro}`);
      erros.push(erro);
      continue;
    }
    const novo = Array.from(new Set([...found.bancasSlug, SLUG_FILIPE, SLUG_PORTO]));
    await prisma.processoTce.update({
      where: { id: found.id },
      data: { bancasSlug: novo },
    });
    compartilhadosAtualizados++;
    console.log(`  [ok] ${numero} -> [${novo.join(", ")}]`);
  }

  for (const numero of SUBPROCESSOS_COMPARTILHADOS) {
    const found = await prisma.subprocessoTce.findFirst({
      where: { numero },
      select: { id: true, bancasSlug: true },
    });
    if (!found) {
      const erro = `Subprocesso compartilhado ${numero} nao encontrado`;
      console.error(`  [ERRO] ${erro}`);
      erros.push(erro);
      continue;
    }
    const novo = Array.from(new Set([...found.bancasSlug, SLUG_FILIPE, SLUG_PORTO]));
    await prisma.subprocessoTce.update({
      where: { id: found.id },
      data: { bancasSlug: novo },
    });
    subCompartilhadosAtualizados++;
    console.log(`  [ok] sub ${numero} -> [${novo.join(", ")}]`);
  }

  // ---------- ETAPA 4: cadastrar processos novos ----------
  console.log("\n--- ETAPA 4: cadastrando processos principais novos ---");
  const municipiosDoEscritorio = await prisma.municipio.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, nome: true },
  });
  const municipioByNome = new Map(municipiosDoEscritorio.map((m) => [m.nome, m.id]));

  const processoIdByNumero = new Map<string, string>();
  let principaisCadastrados = 0;

  for (const p of PROCESSOS) {
    const municipioId = municipioByNome.get(p.municipio);
    if (!municipioId) {
      const erro = `Processo ${p.numero}: municipio '${p.municipio}' nao encontrado`;
      console.error(`  [ERRO] ${erro}`);
      erros.push(erro);
      continue;
    }
    const camara = camaraDoRelator(p.relator, warn);
    const { fase, julgado } = faseDoEstagio(p.estagio);
    const objetoBase = `${p.tipo} - ${p.municipio}${p.exercicio ? ` - exercicio ${p.exercicio}` : ""}`;
    const objeto = p.objetoExtra ? `${objetoBase}\n${p.objetoExtra}` : objetoBase;

    const created = await prisma.processoTce.create({
      data: {
        numero: p.numero,
        tipo: p.tipo,
        municipioId,
        relator: p.relator ?? null,
        camara,
        faseAtual: fase,
        exercicio: p.exercicio ?? null,
        objeto,
        julgado,
        bancasSlug: [SLUG_PORTO],
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processoIdByNumero.set(created.numero, created.id);
    principaisCadastrados++;
    console.log(`  [ok] ${p.numero} | ${p.municipio} | ${p.tipo} | ${camara} | ${fase}`);
  }

  // ---------- ETAPA 5: subprocessos novos ----------
  console.log("\n--- ETAPA 5: cadastrando subprocessos novos ---");
  let subCadastrados = 0;

  for (const s of SUBPROCESSOS) {
    let paiId = processoIdByNumero.get(s.processoPaiNumero);
    if (!paiId) {
      // Pode ser pai ja cadastrado em sessao anterior (ex.: 23100951-3 do FC)
      const found = await prisma.processoTce.findFirst({
        where: { numero: s.processoPaiNumero },
        select: { id: true },
      });
      paiId = found?.id;
    }
    if (!paiId) {
      const erro = `Subprocesso ${s.processoPaiNumero}${s.sufixo}: processo pai nao encontrado`;
      console.error(`  [ERRO] ${erro}`);
      erros.push(erro);
      continue;
    }
    const numero = `${s.processoPaiNumero}${s.sufixo}`;
    const fase = faseDoEstagio(s.estagio).fase;
    const ano = parseInt(s.exercicio, 10);
    const dataInterposicao = isNaN(ano)
      ? new Date()
      : new Date(Date.UTC(ano, 0, 1));

    await prisma.subprocessoTce.create({
      data: {
        processoPaiId: paiId,
        numero,
        tipoRecurso: s.tipoRecurso,
        numeroSequencial: s.numeroSequencial,
        dataInterposicao,
        fase,
        relator: s.relator,
        bancasSlug: s.bancasSlug,
      },
    });
    subCadastrados++;
    console.log(
      `  [ok] ${numero} | ${s.tipoRecurso} | ${s.relator} | ${fase} | [${s.bancasSlug.join(", ")}]`,
    );
  }

  // ---------- Resumo ----------
  console.log("\n========== RESUMO ==========");
  console.log(`Backfill bancasSlug=[filipe-campos]: ${procBackfill.count} processos + ${subBackfill.count} subprocessos`);
  console.log(`Municipios/entidades novas criadas: ${entidadesCriadas}`);
  console.log(`Processos compartilhados atualizados: ${compartilhadosAtualizados}`);
  console.log(`Subprocessos compartilhados atualizados: ${subCompartilhadosAtualizados}`);
  console.log(`Processos principais cadastrados: ${principaisCadastrados} / ${PROCESSOS.length}`);
  console.log(`Subprocessos cadastrados: ${subCadastrados} / ${SUBPROCESSOS.length}`);
  if (avisos.length > 0) {
    console.log(`\nAvisos (${avisos.length}):`);
    Array.from(new Set(avisos)).forEach((a) => console.log(`  - ${a}`));
  }
  if (erros.length > 0) {
    console.log(`\nErros (${erros.length}):`);
    erros.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log("\nSem erros.");
  }

  // Contagens finais para conferencia
  const totalProc = await prisma.processoTce.count();
  const totalSub = await prisma.subprocessoTce.count();
  const totalProcFC = await prisma.processoTce.count({
    where: { bancasSlug: { has: SLUG_FILIPE } },
  });
  const totalProcPR = await prisma.processoTce.count({
    where: { bancasSlug: { has: SLUG_PORTO } },
  });
  console.log(`\nProcessoTce total: ${totalProc} (FC=${totalProcFC} | PR=${totalProcPR})`);
  console.log(`SubprocessoTce total: ${totalSub}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
