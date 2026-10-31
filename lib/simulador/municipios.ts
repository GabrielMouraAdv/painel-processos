// Perfis dos municipios atendidos pelo simulador.
//
// Cada perfil guarda o que a legislacao local decide para o calculo. Campo com
// valor `null` = ainda nao conferido na lei: a tela mostra "a confirmar" e
// deixa a escolha manual. Para incluir um municipio, copie um bloco e preencha
// a partir do estatuto, da lei de contratacao temporaria e do PCCR.

export type FonteLegal = {
  descricao: string;
  url?: string;
};

export type PerfilMunicipio = {
  id: string;
  nome: string;
  uf: "PE";
  temporarios: {
    // Lei municipal de contratacao por excepcional interesse publico (CF, art. 37, IX).
    lei: string | null;
    // A lei (ou o contrato padrao) preve 13º e ferias + 1/3 ao temporario? (Tema 551/STF)
    preve13Ferias: boolean | null;
    // Prazo maximo do contrato com prorrogacoes, em meses: acima disso ha indicio
    // de desvirtuamento (Tema 551, item II, e Tema 916 para o FGTS).
    prazoMaximoMeses: number | null;
  };
  magisterio: {
    pccr: string | null;
    // Jornadas tipicas dos contratos, em horas mensais (200h = 40h semanais).
    jornadasMensais: number[];
  };
  observacoes: string[];
  fontes: FonteLegal[];
};

export const MUNICIPIOS: PerfilMunicipio[] = [
  {
    id: "altinho",
    nome: "Altinho",
    uf: "PE",
    temporarios: {
      lei: null,
      preve13Ferias: null,
      prazoMaximoMeses: null,
    },
    magisterio: {
      pccr: null,
      jornadasMensais: [100, 150, 200],
    },
    observacoes: [
      "Lei de contratação temporária, estatuto e PCCR do magistério ainda não conferidos.",
      "TCE-PE já examinou admissões temporárias da Prefeitura (Boletim TCE-PE nº 369, ago/2021).",
      "Último concurso para professor citado em 2009: indício de uso prolongado de temporários.",
    ],
    fontes: [
      {
        descricao: "Boletim TCE-PE nº 369 (17 a 21/08/2021)",
        url: "https://www.tcepe.tc.br/internet/docs/tce/Boletim369.pdf",
      },
    ],
  },
  {
    id: "carnaiba",
    nome: "Carnaíba",
    uf: "PE",
    temporarios: {
      lei: null,
      preve13Ferias: null,
      prazoMaximoMeses: null,
    },
    magisterio: {
      pccr: "PCCR do Magistério, alterado pela Lei Municipal nº 1.125/2024 (reajuste de 3,62% e novas referências)",
      jornadasMensais: [150, 200],
    },
    observacoes: [
      "Seleção de 2025 (edital no Diário Oficial dos Municípios/AMUPE): 58 vagas, jornadas de 150 a 200 horas mensais, regime estatutário por excepcional interesse público.",
      "O edital diz que a remuneração é proporcional às aulas, observado o piso: conferir se o valor pago de fato alcançou o piso proporcional.",
      "Lei de contratação temporária e estatuto ainda não conferidos (13º e férias ao temporário).",
    ],
    fontes: [
      {
        descricao: "Edital de seleção do magistério 2025 (AMUPE)",
        url: "https://diariomunicipal.com.br/amupe/materia/41D82BF1/eec04a6a7877ba32ea8601be4906c99beec04a6a7877ba32ea8601be4906c99b",
      },
      {
        descricao: "Câmara de Carnaíba: legislação (Lei 1.125/2024)",
        url: "https://transparencia.camaradecarnaiba.pe.gov.br/publico/legislacoes",
      },
    ],
  },
];

export function perfilPorId(id: string): PerfilMunicipio | undefined {
  return MUNICIPIOS.find((m) => m.id === id);
}
