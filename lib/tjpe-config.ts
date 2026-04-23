export type OrgaoJulgadorConfig = {
  label: string;
  diaSemana?:
    | "segunda"
    | "terca"
    | "quarta"
    | "quinta"
    | "sexta"
    | "sabado"
    | "domingo";
  horario?: string;
};

export const ORGAOS_JULGADORES: Record<string, OrgaoJulgadorConfig> = {
  "1a Camara de Direito Publico": {
    label: "1a Camara de Direito Publico",
    diaSemana: "terca",
    horario: "14h",
  },
  "2a Camara de Direito Publico": {
    label: "2a Camara de Direito Publico",
    diaSemana: "quinta",
    horario: "14h",
  },
  "3a Camara de Direito Publico": {
    label: "3a Camara de Direito Publico",
    diaSemana: "terca",
    horario: "9h",
  },
  "4a Camara de Direito Publico": {
    label: "4a Camara de Direito Publico",
    diaSemana: "quarta",
    horario: "9h",
  },
  "Secao de Direito Publico": {
    label: "Secao de Direito Publico",
    diaSemana: "quarta",
    horario: "14h",
  },
  "1a Camara Criminal": {
    label: "1a Camara Criminal",
    diaSemana: "terca",
    horario: "14h",
  },
  "2a Camara Criminal": {
    label: "2a Camara Criminal",
    diaSemana: "quarta",
    horario: "14h",
  },
  "3a Camara Criminal": {
    label: "3a Camara Criminal",
    diaSemana: "quarta",
    horario: "9h",
  },
  "4a Camara Criminal": {
    label: "4a Camara Criminal",
    diaSemana: "terca",
    horario: "9h",
  },
  "Secao Criminal": {
    label: "Secao Criminal",
    diaSemana: "quinta",
    horario: "14h",
  },
  "Camara Regional Caruaru 1a Turma": {
    label: "Camara Regional Caruaru 1a Turma",
    diaSemana: "terca",
    horario: "9h",
  },
  "Camara Regional Caruaru 2a Turma": {
    label: "Camara Regional Caruaru 2a Turma",
    diaSemana: "quarta",
    horario: "9h",
  },
  "Tribunal Pleno": {
    label: "Tribunal Pleno",
    diaSemana: "quarta",
    horario: "14h",
  },
  "Plenario Virtual": {
    label: "Plenario Virtual",
  },
};

export type CargoComposicao =
  | "Presidente"
  | "Titular"
  | "Substituto"
  | "Cargo Vago";

export type MembroComposicao = {
  nome: string;
  cargo: CargoComposicao;
  observacao?: string;
};

export const COMPOSICAO: Record<string, MembroComposicao[]> = {
  "1a Camara de Direito Publico": [
    { nome: "Fernando Cerqueira Norberto dos Santos", cargo: "Presidente" },
    { nome: "Jorge Americo Pereira de Lira", cargo: "Titular" },
    { nome: "Cargo Vago", cargo: "Cargo Vago" },
    { nome: "Ricardo de Oliveira Paes Barreto", cargo: "Titular" },
    { nome: "Jose Ivo de Paula Guimaraes", cargo: "Titular" },
  ],
  "2a Camara de Direito Publico": [
    { nome: "Ricardo de Oliveira Paes Barreto", cargo: "Presidente" },
    { nome: "Jose Ivo de Paula Guimaraes", cargo: "Titular" },
    {
      nome: "Paulo Romero de Sa Araujo",
      cargo: "Substituto",
      observacao: "Substituto do Des. Bandeira de Mello",
    },
    { nome: "Waldemir Tavares de Albuquerque Filho", cargo: "Titular" },
    {
      nome: "Jose Andre Machado Barbosa Pinto",
      cargo: "Substituto",
      observacao: "Substituto de Cargo Vago",
    },
  ],
  "3a Camara de Direito Publico": [
    { nome: "Luiz Carlos de Barros Figueiredo", cargo: "Presidente" },
    { nome: "Erik de Sousa Dantas Simoes", cargo: "Titular" },
    { nome: "Waldemir Tavares de Albuquerque Filho", cargo: "Titular" },
    { nome: "Josue Antonio Fonseca de Sena", cargo: "Titular" },
    { nome: "Andre Oliveira da Silva Guimaraes", cargo: "Titular" },
  ],
  "4a Camara de Direito Publico": [
    { nome: "Josue Antonio Fonseca de Sena", cargo: "Presidente" },
    { nome: "Andre Oliveira da Silva Guimaraes", cargo: "Titular" },
    { nome: "Itamar Pereira da Silva Junior", cargo: "Titular" },
    { nome: "Fernando Cerqueira Norberto dos Santos", cargo: "Titular" },
    { nome: "Jorge Americo Pereira de Lira", cargo: "Titular" },
  ],
  "1a Camara Criminal": [
    { nome: "Jose Viana Ulisses Filho", cargo: "Presidente" },
    { nome: "Honorio Gomes do Rego Filho", cargo: "Titular" },
    {
      nome: "Carlos Gil Rodrigues Filho",
      cargo: "Substituto",
      observacao: "Substituto do Des. Fausto de Castro Campos",
    },
  ],
  "2a Camara Criminal": [
    { nome: "Mauro Alencar de Barros", cargo: "Presidente" },
    { nome: "Evandro Sergio Netto de Magalhaes Melo", cargo: "Titular" },
    { nome: "Isaias Andrade Lins Neto", cargo: "Titular" },
  ],
  "3a Camara Criminal": [
    { nome: "Claudio Jean Nogueira Virginio", cargo: "Presidente" },
    { nome: "Daisy Maria de Andrade Costa Pereira", cargo: "Titular" },
    { nome: "Eudes dos Prazeres Franca", cargo: "Titular" },
  ],
  "4a Camara Criminal": [
    { nome: "Democrito Ramos Reinaldo Filho", cargo: "Presidente" },
    { nome: "Eduardo Guilliod Maranhao", cargo: "Titular" },
    {
      nome: "Marcos Antonio Matos de Carvalho",
      cargo: "Substituto",
      observacao: "Substituto do Des. Alcoforado Assuncao",
    },
  ],
  "Camara Regional Caruaru 1a Turma": [
    { nome: "Alexandre Freire Pimentel", cargo: "Presidente" },
    { nome: "Luciano de Castro Campos", cargo: "Titular" },
    { nome: "Jose Severino Barbosa", cargo: "Titular" },
    { nome: "Paulo Augusto de Freitas Oliveira", cargo: "Titular" },
    {
      nome: "Evanildo Coelho de Araujo Filho",
      cargo: "Substituto",
      observacao: "Substituto do Des. Evio Marques da Silva",
    },
  ],
  "Camara Regional Caruaru 2a Turma": [
    { nome: "Paulo Augusto de Freitas Oliveira", cargo: "Presidente" },
    { nome: "Paulo Victor Vasconcelos de Almeida", cargo: "Titular" },
    {
      nome: "Evanildo Coelho de Araujo Filho",
      cargo: "Substituto",
      observacao: "Substituto do Des. Evio Marques da Silva",
    },
    { nome: "Luciano de Castro Campos", cargo: "Titular" },
    { nome: "Jose Severino Barbosa", cargo: "Titular" },
  ],
};

export const TIPOS_RECURSO: string[] = [
  "Apelacao",
  "Embargos de Declaracao",
  "Agravo de Instrumento",
  "Agravo Interno",
  "Agravo Regimental",
  "Remessa Necessaria",
  "Mandado de Seguranca",
  "Habeas Corpus",
  "Acao Rescisoria",
  "Conflito de Competencia",
  "Recurso em Sentido Estrito",
  "Correicao Parcial",
  "Outro",
];

export const TIPOS_SESSAO: { key: string; label: string }[] = [
  { key: "presencial", label: "Presencial" },
  { key: "virtual", label: "Virtual" },
  { key: "plenario_virtual", label: "Plenario Virtual" },
];

export function orgaosJulgadoresList(): OrgaoJulgadorConfig[] {
  return Object.values(ORGAOS_JULGADORES);
}

export function desembargadoresDoOrgao(orgao: string): string[] {
  return (COMPOSICAO[orgao] ?? [])
    .filter((m) => m.cargo !== "Cargo Vago")
    .map((m) => m.nome);
}

export function todosDesembargadores(): string[] {
  const set = new Set<string>();
  for (const orgao of Object.keys(COMPOSICAO)) {
    for (const m of COMPOSICAO[orgao]) {
      if (m.cargo !== "Cargo Vago") set.add(m.nome);
    }
  }
  return Array.from(set).sort();
}
