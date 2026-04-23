export type OrgaoJulgadorTrf5Config = {
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

export const ORGAOS_JULGADORES_TRF5: Record<string, OrgaoJulgadorTrf5Config> = {
  "1a Turma": {
    label: "1a Turma",
    diaSemana: "quinta",
    horario: "9h",
  },
  "2a Turma": {
    label: "2a Turma",
    diaSemana: "terca",
    horario: "13h30",
  },
  "3a Turma": {
    label: "3a Turma",
    diaSemana: "quinta",
    horario: "9h",
  },
  "4a Turma": {
    label: "4a Turma",
    diaSemana: "terca",
    horario: "13h30",
  },
  "5a Turma": {
    label: "5a Turma",
    diaSemana: "terca",
    horario: "9h30",
  },
  "6a Turma": {
    label: "6a Turma",
    diaSemana: "terca",
    horario: "9h",
  },
  "7a Turma": {
    label: "7a Turma",
    diaSemana: "terca",
    horario: "9h",
  },
  "1a Secao": {
    label: "1a Secao",
    diaSemana: "quarta",
    horario: "14h",
  },
  "2a Secao": {
    label: "2a Secao",
    diaSemana: "quarta",
    horario: "14h",
  },
  "3a Secao": {
    label: "3a Secao",
    diaSemana: "quarta",
    horario: "14h",
  },
  "Pleno TRF5": {
    label: "Pleno TRF5",
    diaSemana: "quarta",
    horario: "14h",
  },
  "Plenario Virtual TRF5": {
    label: "Plenario Virtual TRF5",
  },
};

export type CargoComposicaoTrf5 =
  | "Presidente"
  | "Titular"
  | "Substituto"
  | "Cargo Vago";

export type MembroComposicaoTrf5 = {
  nome: string;
  cargo: CargoComposicaoTrf5;
  observacao?: string;
};

export const COMPOSICAO_TRF5: Record<string, MembroComposicaoTrf5[]> = {
  "1a Turma": [
    { nome: "Elio Wanderley de Siqueira Filho", cargo: "Presidente" },
    { nome: "Roberto Wanderley Nogueira", cargo: "Titular" },
    { nome: "Edvaldo Batista da Silva Junior", cargo: "Titular" },
  ],
  "2a Turma": [
    { nome: "Paulo Roberto de Oliveira Lima", cargo: "Presidente" },
    { nome: "Edilson Pereira Nobre Junior", cargo: "Titular" },
    { nome: "Paulo Machado Cordeiro", cargo: "Titular" },
  ],
  "3a Turma": [
    { nome: "Cid Marconi Gurgel de Souza", cargo: "Presidente" },
    { nome: "Rogerio de Meneses Fialho Moreira", cargo: "Titular" },
    { nome: "Alexandre Costa de Luna Freire", cargo: "Titular" },
  ],
  "4a Turma": [
    { nome: "Fernando Braga Damasceno", cargo: "Presidente" },
    { nome: "Manoel de Oliveira Erhardt", cargo: "Titular" },
    { nome: "Rubens de Mendonca Canuto Neto", cargo: "Titular" },
  ],
  "5a Turma": [
    { nome: "Cibele Benevides Guedes da Fonseca", cargo: "Presidente" },
    { nome: "Francisco Alves dos Santos Junior", cargo: "Titular" },
    { nome: "Gisele Chaves Sampaio Alcantara", cargo: "Titular" },
  ],
  "6a Turma": [
    { nome: "Germana de Oliveira Moraes", cargo: "Presidente" },
    { nome: "Rodrigo Antonio Tenorio Correia da Silva", cargo: "Titular" },
    { nome: "Walter Nunes da Silva Junior", cargo: "Titular" },
  ],
  "7a Turma": [
    { nome: "Frederico Wildson da Silva Dantas", cargo: "Presidente" },
    { nome: "Leonardo Henrique de Cavalcante Carvalho", cargo: "Titular" },
    { nome: "Leonardo Augusto Nunes Coutinho", cargo: "Titular" },
  ],
  "1a Secao": [
    { nome: "Manoel de Oliveira Erhardt", cargo: "Presidente" },
    { nome: "Paulo Roberto de Oliveira Lima", cargo: "Titular" },
    { nome: "Rogerio de Meneses Fialho Moreira", cargo: "Titular" },
    { nome: "Elio Wanderley de Siqueira Filho", cargo: "Titular" },
    { nome: "Leonardo Henrique de Cavalcante Carvalho", cargo: "Titular" },
    { nome: "Francisco Alves dos Santos Junior", cargo: "Titular" },
    { nome: "Walter Nunes da Silva Junior", cargo: "Titular" },
  ],
  "2a Secao": [
    { nome: "Fernando Braga Damasceno", cargo: "Presidente" },
    { nome: "Edilson Pereira Nobre Junior", cargo: "Titular" },
    { nome: "Paulo Machado Cordeiro", cargo: "Titular" },
    { nome: "Germana de Oliveira Moraes", cargo: "Titular" },
    { nome: "Frederico Wildson da Silva Dantas", cargo: "Titular" },
    { nome: "Edvaldo Batista da Silva Junior", cargo: "Titular" },
    { nome: "Gisele Chaves Sampaio Alcantara", cargo: "Titular" },
  ],
  "3a Secao": [
    { nome: "Rubens de Mendonca Canuto Neto", cargo: "Presidente" },
    { nome: "Cid Marconi Gurgel de Souza", cargo: "Titular" },
    { nome: "Alexandre Costa de Luna Freire", cargo: "Titular" },
    { nome: "Roberto Wanderley Nogueira", cargo: "Titular" },
    { nome: "Leonardo Augusto Nunes Coutinho", cargo: "Titular" },
    { nome: "Rodrigo Antonio Tenorio Correia da Silva", cargo: "Titular" },
    { nome: "Cibele Benevides Guedes da Fonseca", cargo: "Titular" },
  ],
  "Pleno TRF5": [
    { nome: "Francisco Roberto Machado", cargo: "Presidente" },
    { nome: "Paulo Roberto de Oliveira Lima", cargo: "Titular" },
    { nome: "Manoel de Oliveira Erhardt", cargo: "Titular" },
    { nome: "Rogerio de Meneses Fialho Moreira", cargo: "Titular" },
    { nome: "Edilson Pereira Nobre Junior", cargo: "Titular" },
    { nome: "Fernando Braga Damasceno", cargo: "Titular" },
    { nome: "Paulo Machado Cordeiro", cargo: "Titular" },
    { nome: "Cid Marconi Gurgel de Souza", cargo: "Titular" },
    { nome: "Rubens de Mendonca Canuto Neto", cargo: "Titular" },
    { nome: "Alexandre Costa de Luna Freire", cargo: "Titular" },
    { nome: "Elio Wanderley de Siqueira Filho", cargo: "Titular" },
    { nome: "Leonardo Henrique de Cavalcante Carvalho", cargo: "Titular" },
    { nome: "Roberto Wanderley Nogueira", cargo: "Titular" },
    { nome: "Francisco Alves dos Santos Junior", cargo: "Titular" },
    { nome: "Germana de Oliveira Moraes", cargo: "Titular" },
    { nome: "Joana Carolina Lins Pereira", cargo: "Titular" },
    { nome: "Leonardo Resende Martins", cargo: "Titular" },
    { nome: "Frederico Wildson da Silva Dantas", cargo: "Titular" },
    { nome: "Leonardo Augusto Nunes Coutinho", cargo: "Titular" },
    { nome: "Rodrigo Antonio Tenorio Correia da Silva", cargo: "Titular" },
    { nome: "Cibele Benevides Guedes da Fonseca", cargo: "Titular" },
    { nome: "Edvaldo Batista da Silva Junior", cargo: "Titular" },
    { nome: "Walter Nunes da Silva Junior", cargo: "Titular" },
  ],
};

export const TIPOS_RECURSO_TRF5: string[] = [
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

export function orgaosJulgadoresTrf5List(): OrgaoJulgadorTrf5Config[] {
  return Object.values(ORGAOS_JULGADORES_TRF5);
}

export function desembargadoresDoOrgaoTrf5(orgao: string): string[] {
  return (COMPOSICAO_TRF5[orgao] ?? [])
    .filter((m) => m.cargo !== "Cargo Vago")
    .map((m) => m.nome);
}

export function todosDesembargadoresTrf5(): string[] {
  const set = new Set<string>();
  for (const orgao of Object.keys(COMPOSICAO_TRF5)) {
    for (const m of COMPOSICAO_TRF5[orgao]) {
      if (m.cargo !== "Cargo Vago") set.add(m.nome);
    }
  }
  return Array.from(set).sort();
}
