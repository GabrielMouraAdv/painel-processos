export type LinkUtil = {
  titulo: string;
  descricao: string;
  url: string;
};

export type GrupoLinks = {
  titulo: string;
  descricao: string;
  /** Nome do icone lucide usado na pagina (mapeado la). */
  icone: "search" | "scale" | "monitor";
  links: LinkUtil[];
};

export const LINKS_ELEITORAIS: GrupoLinks[] = [
  {
    titulo: "Jurisprudencia",
    descricao: "Pesquisa de acordaos e precedentes.",
    icone: "search",
    links: [
      {
        titulo: "Jurisprudencia TRE-PE",
        descricao: "Busca de acordaos e decisoes do Tribunal Regional de PE",
        url: "https://jurisprudencia.tre-pe.jus.br/#/jurisprudencia/pesquisa",
      },
      {
        titulo: "Jurisprudencia TSE",
        descricao: "Busca de acordaos e decisoes do Tribunal Superior",
        url: "https://jurisprudencia.tse.jus.br/#/jurisprudencia/pesquisa",
      },
    ],
  },
  {
    titulo: "Resolucoes TSE — Eleicoes 2026",
    descricao: "Texto compilado no portal do TSE.",
    icone: "scale",
    links: [
      {
        titulo: "Res. 23.755/2026 — Propaganda eleitoral",
        descricao: "Propaganda, utilizacao e geracao do horario gratuito",
        url: "https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-755-de-2-de-marco-de-2026",
      },
      {
        titulo: "Res. 23.757/2026 — Ilicitos eleitorais",
        descricao: "Representacoes, reclamacoes e apuracao de ilicitos",
        url: "https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-757-de-2-de-marco-de-2026",
      },
      {
        titulo: "Res. 23.756/2026 — Direito de resposta",
        descricao: "Procedimento do direito de resposta",
        url: "https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-756-de-2-de-marco-de-2026",
      },
      {
        titulo: "Res. 23.747/2026 — Pesquisas eleitorais",
        descricao: "Registro e divulgacao de pesquisas de opiniao",
        url: "https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-747-de-26-de-fevereiro-de-2026",
      },
      {
        titulo: "Res. 23.760/2026 — Calendario eleitoral",
        descricao: "Datas e prazos do pleito de 2026",
        url: "https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-760-de-2-de-marco-de-2026",
      },
    ],
  },
  {
    titulo: "Sistemas",
    descricao: "Acesso ao processo eletronico.",
    icone: "monitor",
    links: [
      {
        titulo: "PJe TRE-PE (2o grau)",
        descricao: "Login no processo judicial eletronico do TRE-PE",
        url: "https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth?response_type=code&client_id=pje-trepe-2g&redirect_uri=https%3A%2F%2Fpje.tre-pe.jus.br%2Fpje%2Flogin.seam&state=98c20df0-f354-48af-9f47-4fa7f15d96cf&login=true&scope=openid",
      },
    ],
  },
];
