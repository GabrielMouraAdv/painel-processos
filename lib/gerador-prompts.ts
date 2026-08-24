/**
 * Gerador de Prompts NotebookLM do escritorio — dados e logica (client-safe).
 * Modulos: TCE-PE, Eleitoral e Contencioso (civel, trabalhista, execucoes).
 * Prazos conferidos na LOTCE (Lei 12.600/2004), RI TCE-PE (Res. 15/2010 +
 * Res. 241/2024), Res. TC 155/2021, Codigo Eleitoral, Lei 9.504/97, CPC e CLT.
 */

export type CampoTipo = "text" | "ta" | "select";

export type Campo = {
  id: string;
  l: string;
  t: CampoTipo;
  ph?: string;
  req?: boolean;
  help?: string;
  opts?: string[];
};

export type Cenario = {
  id: string;
  ico: string;
  tit: string;
  prazo: string;
  desc: string;
  /** Pode conter <b> — renderizar com dangerouslySetInnerHTML; e feito strip no prompt. */
  base: string;
  papel: string;
  descobrir: string[];
  tarefa: string[];
  minimos: string[];
  criterio: string;
};

export type Modulo = {
  id: "tce" | "ele" | "con";
  nome: string;
  tag: string;
  icon: string;
  titulo: string;
  sub: string;
  fields: Campo[];
  cen: Cenario[];
};

export type ValoresForm = {
  campos: Record<string, string>;
  descobrir: number[];
  web: boolean;
  fmt: string;
  obs: string;
};

export const FORMATOS = [
  "— escolha —",
  "Tabela/quadro + análise narrativa final",
  "Análise narrativa estratégica",
  "Tabela comparativa objetiva",
  "Minuta estruturada da peça (tópicos com fundamentos)",
];

const FONTES_PADRAO = `Use TODAS as fontes carregadas neste notebook como base ancorada da sua análise (autos, relatórios, decisões, legislação e jurisprudência).
Para cada afirmação relevante, indique a fonte exata (documento, página/trecho, órgão, data) por meio das citações nativas do NotebookLM.`;

const RESTRICOES_PADRAO = [
  "Use APENAS as fontes carregadas no notebook como base factual. Não invente dispositivos, julgados ou fatos.",
  "Cite o trecho exato em cada afirmação relevante (use o sistema nativo de citações).",
  'Se uma fonte for ambígua ou contraditória, sinalize expressamente em vez de "harmonizar".',
  'Se faltar informação para uma conclusão, diga "não há base nas fontes carregadas para afirmar X".',
  "Não formate como petição final: entregue a análise/minuta estruturada para revisão do advogado.",
];

/* ---- campos comuns por modulo ---- */
const F_TCE: Campo[] = [
  { id: "proc", l: "Processo TC nº", t: "text", ph: "Ex.: TC 24100xxx-x", req: true },
  { id: "tipo", l: "Tipo de processo", t: "select", opts: ["— escolha —", "Auditoria Especial", "Prestação de Contas de Governo", "Prestação de Contas de Gestão", "Gestão Fiscal", "Admissão de Pessoal", "Auto de Infração", "Medida Cautelar", "Denúncia / Representação", "Outro"] },
  { id: "orgao", l: "Órgão / unidade gestora e exercício", t: "text", ph: "Ex.: Prefeitura de ..., exercício 2024" },
  { id: "rel", l: "Relatoria", t: "text", ph: "Conselheiro(a) relator(a)" },
  { id: "parte", l: "Interessado(s) e cargo(s)", t: "text", ph: "Ex.: Fulano de Tal — Prefeito; Sicrano — Secretário de..." },
  { id: "fatos", l: "Resumo dos achados / imputações", t: "ta", ph: "Descreva os achados do relatório de auditoria ou os fundamentos da decisão atacada, um por linha.", req: true, help: "Seja específico: item do relatório, valor do dano apontado, dispositivo tido por violado." },
  { id: "teses", l: "Teses e fatos favoráveis já identificados", t: "ta", ph: "Ex.: ausência de dolo; contas de governo x gestão; parecer jurídico favorável; LINDB art. 22 (contexto do gestor)..." },
  { id: "docs", l: "Documentos carregados no notebook", t: "ta", ph: "Ex.: Relatório de Auditoria; Defesa Prévia anterior; NE/NF; LOTCE; Regimento Interno; acórdãos do TCE-PE..." },
];

const F_ELE: Campo[] = [
  { id: "proc", l: "Processo nº (CNJ)", t: "text", ph: "Ex.: 06001xx-xx.2026.6.17.0000", req: true },
  { id: "classe", l: "Classe / rito", t: "select", opts: ["— escolha —", "Representação — propaganda antecipada (art. 36-A)", "Representação — propaganda irregular", "Representação — pesquisa eleitoral", "Direito de resposta", "AIJE", "Recurso / Agravo interno", "Outro"] },
  { id: "rel", l: "Relatoria / juízo", t: "text", ph: "Ex.: Des. ... — TRE-PE" },
  { id: "parte", l: "Partes (representante × representado)", t: "text", ph: "Ex.: Partido X × João Campos e PSB", req: true },
  { id: "fatos", l: "Resumo dos fatos imputados / da decisão", t: "ta", ph: "O que a inicial imputa (publicação, data, plataforma, alcance) ou o que a decisão decidiu.", req: true },
  { id: "teses", l: "Teses e fatos favoráveis já identificados", t: "ta", ph: "Ex.: ausência de pedido explícito de voto; liberdade de expressão; mero ato de pré-campanha (art. 36-A); perda de objeto..." },
  { id: "docs", l: "Documentos carregados no notebook", t: "ta", ph: "Ex.: inicial; mídias/prints; decisão liminar; Lei 9.504/97; Res. TSE 23.608 e 23.610; precedentes TRE-PE/TSE..." },
];

const F_CON: Campo[] = [
  { id: "proc", l: "Processo nº (CNJ)", t: "text", ph: "Ex.: 000xxxx-xx.2025.8.17.xxxx" },
  { id: "juizo", l: "Juízo / vara / tribunal de origem", t: "text", ph: "Ex.: 2ª Vara da Fazenda Pública de ..." },
  { id: "trib", l: "Tribunal / instância de destino", t: "select", opts: ["— escolha —", "TJPE", "TRF5", "STJ", "STF", "TRT6", "TST", "1º grau (Justiça Estadual)", "1º grau (Justiça Federal)", "Outro"] },
  { id: "parte", l: "Partes e posição do cliente", t: "text", ph: "Ex.: Município X (réu/executado) × Fulano (autor/exequente)", req: true },
  { id: "valor", l: "Valor da causa / valor executado", t: "text", ph: "Ex.: R$ 250.000,00" },
  { id: "fatos", l: "Resumo fático e objeto da demanda", t: "ta", ph: "O que se pede, com base em quê, e em que fase o processo está.", req: true },
  { id: "teses", l: "Teses e fatos favoráveis já identificados", t: "ta", ph: "Preliminares, prejudiciais (prescrição/decadência), mérito, provas favoráveis..." },
  { id: "docs", l: "Documentos carregados no notebook", t: "ta", ph: "Ex.: inicial; contratos; CDA; sentença; laudos; legislação e jurisprudência aplicáveis..." },
];

const D_DEF = ["Mapa achado × defesa possível (item a item)", "Fragilidades probatórias da acusação", "Individualização de condutas e responsabilidades", "Precedentes favoráveis nas fontes", "Aplicação da LINDB (arts. 20, 22 e 28)", "Riscos residuais e estratégia"];
const D_REC = ["Vícios e pontos atacáveis da decisão", "Contradições internas da deliberação", "Divergência com precedentes carregados", "Argumentos não enfrentados (omissões)", "Matriz argumento × probabilidade de êxito", "Estratégia recursal recomendada"];

export const MODULOS: Modulo[] = [
  {
    id: "tce",
    nome: "TCE-PE",
    tag: "CONTROLE EXTERNO",
    icon: "🏛️",
    titulo: "Qual peça você vai produzir no TCE-PE?",
    sub: "Prazos e fundamentos conforme a LOTCE (Lei 12.600/2004), o Regimento Interno (Res. TC 15/2010, com a Res. 241/2024 — dias úteis) e a Res. TC 155/2021 (cautelares).",
    fields: F_TCE,
    cen: [
      {
        id: "defesa-previa", ico: "🛡️", tit: "Defesa Prévia", prazo: "30 dias úteis",
        desc: "Resposta aos achados do relatório de auditoria — art. 49 da LOTCE e art. 131 do RI.",
        base: "Prazo de <b>30 dias úteis</b> da notificação (art. 49 da LOTCE; art. 131 do RI, red. Res. 241/2024). A defesa de um responsável aproveita aos demais nas circunstâncias objetivas (art. 132-A do RI).",
        papel: "Você é um advogado sênior especialista em Direito Administrativo e controle externo, com longa prática no TCE-PE, encarregado de estruturar uma DEFESA PRÉVIA.",
        descobrir: D_DEF,
        tarefa: [
          "Leia integralmente o relatório de auditoria e liste TODOS os achados/imputações, com o valor de eventual débito e o dispositivo tido por violado.",
          "Para cada achado, monte o par acusação × defesa: fato favorável, prova nas fontes, tese jurídica aplicável e precedente do TCE-PE ou TCU carregado que a sustente.",
          "Verifique a individualização das condutas: aponte imputações genéricas, sem nexo causal ou dirigidas a agente sem competência para o ato.",
          "Avalie a aplicação dos arts. 20, 22 e 28 da LINDB (contexto do gestor, obstáculos reais, dolo ou erro grosseiro) a cada imputação.",
          "Aponte fragilidades metodológicas da auditoria: amostragem, quantificação do dano, ausência de contraditório sobre documento específico.",
          "Classifique cada achado por gravidade e probabilidade de acolhimento da defesa (alta/média/baixa), justificando.",
        ],
        minimos: ["Quadro achado × tese de defesa × prova × precedente", "Indicação dos 3 achados mais sensíveis e como neutralizá-los", "Sinalização de lacunas probatórias que o escritório precisa suprir", "Recomendação de estrutura da peça (ordem das teses)"],
        criterio: "Uma boa resposta me permite redigir a defesa prévia item a item, sem deixar achado sem resposta e sem tese órfã de prova.",
      },
      {
        id: "manif-cautelar", ico: "⚡", tit: "Manifestação Prévia em Medida Cautelar", prazo: "5 dias úteis",
        desc: "Resposta à oitiva ou à cautelar já concedida — Res. TC 155/2021, arts. 10 e 14.",
        base: "Prazo <b>improrrogável de 5 dias úteis</b> (arts. 10 e 14 da Res. TC 155/2021). O relator decide em até 10 dias úteis da formalização (art. 12) e submete à Câmara até a 3ª sessão. Aplicação subsidiária do CPC e da Lei 8.437/92.",
        papel: "Você é um advogado sênior especialista em tutelas de urgência no controle externo (TCE-PE), encarregado de estruturar a MANIFESTAÇÃO PRÉVIA da parte em processo de Medida Cautelar.",
        descobrir: ["Ausência de fumus boni iuris", "Ausência de periculum in mora", "Periculum in mora reverso (dano da paralisação)", "Desproporcionalidade da medida", "Vícios formais do pedido (art. 7º da Res. 155/2021)", "Alternativas menos gravosas a sugerir"],
        tarefa: [
          "Identifique com precisão o objeto da cautelar: o que foi (ou pode ser) suspenso e quais os fundamentos do pedido ou da decisão monocrática.",
          "Ataque o fumus boni iuris: confronte cada indício apontado com as provas e documentos carregados que o infirmem.",
          "Ataque o periculum in mora: demonstre, com base nas fontes, a ausência de risco concreto ao erário ou ao resultado útil do processo.",
          "Construa o periculum reverso: consequências práticas da suspensão (continuidade de serviço público, contratos em execução, prejuízo à população).",
          "Verifique vícios formais do pedido à luz do art. 7º da Res. TC 155/2021 (pedido, causa de pedir, legitimidade, lógica da conclusão, documentos indispensáveis).",
          "Sugira, subsidiariamente, medidas menos gravosas (caução, suspensão parcial, prazo para regularização).",
        ],
        minimos: ["Síntese do objeto e do estado atual da cautelar", "Confronto ponto a ponto: fundamento da cautelar × prova em contrário", "Argumentação do periculum reverso com dados concretos das fontes", "Pedidos sugeridos em ordem (principal e subsidiários)"],
        criterio: "Uma boa resposta me dá, em 5 dias úteis, o esqueleto completo da manifestação: o que atacar, com qual prova, e o que pedir.",
      },
      {
        id: "agravo-cautelar", ico: "⚔️", tit: "Agravo Regimental em Cautelar", prazo: "5 dias úteis · Pleno",
        desc: "Contra a decisão da Câmara que homologa a cautelar — Res. TC 155/2021, art. 16.",
        base: "Prazo de <b>5 dias úteis</b> da publicação (art. 16 da Res. TC 155/2021), dirigido ao <b>Pleno</b>; julgamento até a 2ª sessão subsequente, distribuído a Conselheiro que não participou da deliberação. Cabem também Embargos de Declaração no mesmo prazo.",
        papel: "Você é um advogado sênior especialista em recursos no controle externo (TCE-PE), encarregado de estruturar um AGRAVO REGIMENTAL ao Pleno contra decisão que homologou Medida Cautelar.",
        descobrir: D_REC,
        tarefa: [
          "Disseque a decisão agravada: fundamentos de fato e de direito, o que exatamente foi determinado e desde quando produz efeitos.",
          "Confronte cada fundamento com as provas e normas carregadas, apontando error in judicando e error in procedendo.",
          "Verifique a regularidade do procedimento cautelar à luz da Res. TC 155/2021 (oitiva do art. 10, prazo do art. 12, homologação do art. 13).",
          "Demonstre a insubsistência dos requisitos da tutela (fumus/periculum) com base nas fontes, e o periculum reverso.",
          "Identifique precedentes do próprio TCE-PE ou do Pleno carregados no notebook que destoem da decisão agravada.",
          "Estruture o pedido: efeito suspensivo/reconsideração, reforma integral ou parcial, e alternativas menos gravosas.",
        ],
        minimos: ["Quadro fundamento da decisão × contra-argumento × fonte", "Vícios procedimentais identificados (se houver)", "Precedentes divergentes com citação exata", "Estratégia: o que pedir ao Pleno e ordem dos pedidos"],
        criterio: "Uma boa resposta me permite protocolar em 5 dias úteis um agravo que obrigue o Pleno a reexaminar cada pilar da cautelar.",
      },
      {
        id: "embargos-tce", ico: "🔍", tit: "Embargos de Declaração", prazo: "5 dias",
        desc: "Obscuridade, contradição ou omissão — art. 81 da LOTCE. Interrompem o prazo dos demais recursos.",
        base: "Prazo de <b>5 dias</b> da publicação (art. 81, § 1º, da LOTCE). Vícios: obscuridade, contradição ou omissão. <b>Interrompem</b> o prazo para outros recursos (§ 2º). Distribuição obrigatória ao relator originário (art. 77, § 8º). Protelatórios geram multa (art. 82).",
        papel: "Você é um advogado sênior especialista em recursos no TCE-PE, encarregado de estruturar EMBARGOS DE DECLARAÇÃO com foco em prequestionamento e correção de vícios da deliberação.",
        descobrir: ["Omissões: teses da defesa não enfrentadas", "Contradições internas do voto/acórdão", "Obscuridades (dispositivo × fundamentação)", "Erros materiais e de cálculo", "Pontos a prequestionar para o recurso ordinário", "Risco de multa por protelação (avaliar)"],
        tarefa: [
          "Compare a deliberação embargada com a peça de defesa: liste TODA tese arguida e não enfrentada (omissão).",
          "Identifique contradições internas: fundamentação × dispositivo, voto × ementa, valores divergentes entre trechos.",
          "Aponte obscuridades que impeçam compreender o alcance da decisão (quem foi condenado, a quê, em que valor, solidariedade).",
          "Verifique erros materiais e de cálculo, cotejando com os documentos das fontes.",
          "Para cada vício, redija o núcleo do argumento indicando o trecho exato da deliberação e o trecho exato da defesa/prova ignorada.",
          "Aponte o que deve ficar prequestionado para viabilizar o recurso ordinário.",
        ],
        minimos: ["Tabela: vício × trecho da decisão × trecho da defesa/prova × efeito pretendido", "Hierarquia dos vícios (mais fortes primeiro)", "Avaliação de risco de multa por embargos protelatórios", "Redação sugerida do pedido (efeitos infringentes, se cabíveis)"],
        criterio: "Uma boa resposta transforma a deliberação em uma lista objetiva de vícios embargáveis, cada um com sua prova, pronta para virar peça.",
      },
      {
        id: "recurso-ordinario", ico: "📜", tit: "Recurso Ordinário", prazo: "30 dias",
        desc: "Anulação ou reforma da deliberação — art. 78 da LOTCE. Regra: duplo efeito.",
        base: "Prazo de <b>30 dias</b> da publicação (art. 78, § 1º, da LOTCE). Recebido em <b>ambos os efeitos</b> (salvo aposentadoria/reforma/pensão: só devolutivo). Relator diverso do originário (art. 77, § 8º; art. 238 do RI). Não cabe contra deliberação em pedido de rescisão (art. 238-A do RI).",
        papel: "Você é um advogado sênior especialista em recursos no controle externo, encarregado de estruturar um RECURSO ORDINÁRIO contra deliberação do TCE-PE (julgamento de contas, débito e/ou multa).",
        descobrir: D_REC,
        tarefa: [
          "Disseque a deliberação recorrida: cada fundamento de irregularidade, o débito e a multa aplicados, e a base probatória de cada um.",
          "Confronte cada fundamento com o conjunto probatório carregado, indicando onde a prova foi mal valorada ou ignorada.",
          "Verifique questões de ordem pública: prescrição, cerceamento de defesa, ilegitimidade, decisão extra petita, ausência de individualização.",
          "Aplique a LINDB (arts. 20, 22 e 28) e a jurisprudência carregada à situação concreta de cada imputação mantida.",
          "Reavalie a dosimetria: proporcionalidade da multa, base de cálculo do débito, solidariedade indevida.",
          "Monte a matriz recursal: argumento × probabilidade de êxito × precedente de apoio, e recomende a ordem das teses na peça.",
        ],
        minimos: ["Matriz: imputação mantida × tese recursal × prova × precedente", "Preliminares viáveis destacadas", "Análise da dosimetria (débito e multa) com cálculos conferidos", "Recomendação estratégica: o que pedir (anulação × reforma) e por quê"],
        criterio: "Uma boa resposta me diz exatamente quais imputações têm chance real de reversão e com quais argumentos, em ordem de força.",
      },
      {
        id: "rescisao", ico: "⏳", tit: "Pedido de Rescisão", prazo: "2 anos do trânsito",
        desc: "Prova falsa, documento novo ou erro de cálculo — art. 83 da LOTCE e arts. 239 a 239-C do RI.",
        base: "Cabimento restrito (art. 83 da LOTCE): <b>I)</b> prova cuja falsidade foi comprovada em juízo; <b>II)</b> documentos novos capazes de elidir a prova; <b>III)</b> erro de cálculo — este exige <b>cotejo analítico</b> (art. 239-A, § 3º, do RI). Prazo de <b>2 anos</b> da irrecorribilidade. Sem efeito suspensivo. Admissibilidade pelo Vice-Presidente; da inadmissão cabe agravo em <b>15 dias úteis</b> ao Pleno (art. 239-C do RI).",
        papel: "Você é um advogado sênior especialista em rescisão de julgados no controle externo, encarregado de avaliar o cabimento e estruturar um PEDIDO DE RESCISÃO no TCE-PE.",
        descobrir: ["Enquadramento exato na hipótese de cabimento", "Se documento novo: por que não pôde ser juntado antes", "Se erro de cálculo: cotejo analítico completo", "Tempestividade (2 anos da irrecorribilidade)", "Relação direta do fundamento com a controvérsia", "Probabilidade de admissão pelo Vice-Presidente"],
        tarefa: [
          "Verifique a tempestividade: data da irrecorribilidade da deliberação × data-limite de 2 anos.",
          "Enquadre o caso rigorosamente em uma das três hipóteses do art. 83 da LOTCE — e diga com franqueza se NÃO se enquadra.",
          "Se documento novo: demonstre que não é documento que a parte negligenciou (art. 239-A, § 1º, do RI) e que tem relação direta com a controvérsia (§ 2º).",
          "Se erro de cálculo: produza o cotejo analítico entre os cálculos da auditoria/deliberação e o correto, planilha por planilha (art. 239-A, § 3º).",
          "Se prova falsa: identifique a decisão judicial que comprovou a falsidade e o nexo com o fundamento da deliberação.",
          "Antecipe o juízo de admissibilidade do Vice-Presidente: liste os pontos que podem levar à negativa de seguimento e como blindá-los.",
        ],
        minimos: ["Parecer objetivo de cabimento (cabe / não cabe / cabe com risco) com fundamento", "Demonstração da tempestividade com datas", "Núcleo probatório do fundamento escolhido, com citações exatas", "Plano B: agravo do art. 239-C em caso de inadmissão"],
        criterio: "Uma boa resposta me diz com honestidade se o pedido sobrevive ao juízo de admissibilidade — e, se sim, entrega o esqueleto completo da peça.",
      },
    ],
  },
  {
    id: "ele",
    nome: "Eleitoral",
    tag: "TRE-PE · 2026",
    icon: "🗳️",
    titulo: "Qual peça ou análise eleitoral?",
    sub: "Rito das representações: Lei 9.504/97 e Res.-TSE 23.608/2019; propaganda: Res.-TSE 23.610/2019; pesquisas: Res.-TSE 23.600/2019; recursos ao TSE: arts. 276 e 279 do Código Eleitoral. Prazos eleitorais são curtíssimos e correm inclusive em finais de semana no período eleitoral — confira sempre o rito do caso.",
    fields: F_ELE,
    cen: [
      {
        id: "defesa-rep", ico: "🛡️", tit: "Defesa em Representação", prazo: "2 dias",
        desc: "Propaganda antecipada (art. 36-A) ou irregular — defesa no rito da Res.-TSE 23.608/2019.",
        base: "Defesa em <b>2 dias</b> da notificação no rito das representações da Lei 9.504/97 (Res.-TSE 23.608/2019). Em propaganda antecipada, o eixo é o art. 36-A da Lei 9.504/97: menção a pretensa candidatura e exaltação de qualidades NÃO são propaganda antecipada quando ausente pedido explícito de voto.",
        papel: "Você é um advogado eleitoralista sênior, com prática contenciosa no TRE-PE, encarregado de estruturar a DEFESA em representação eleitoral.",
        descobrir: ["Ausência de pedido explícito de voto (art. 36-A)", "Atipicidade da conduta imputada", "Ilegitimidade / ausência de prova do prévio conhecimento", "Liberdade de expressão e crítica política", "Fragilidade probatória da inicial (prints sem ata notarial etc.)", "Perda de objeto / ausência de interesse"],
        tarefa: [
          "Disseque a inicial: cada publicação/conduta imputada, com data, plataforma, conteúdo exato e alcance alegado.",
          "Para cada conduta, verifique a tipicidade à luz do art. 36-A da Lei 9.504/97 e da Res.-TSE 23.610/2019: há pedido explícito de voto? Há gasto vedado?",
          "Confronte as provas da inicial com o material carregado: prints sem autenticação, recortes fora de contexto, ausência de prova de impulsionamento ou de prévio conhecimento.",
          "Levante, nas fontes carregadas, os precedentes do TRE-PE e do TSE mais próximos do caso concreto (favoráveis e contrários), com o distinguishing necessário.",
          "Construa as preliminares cabíveis: inépcia, ilegitimidade, litispendência com representações idênticas já julgadas.",
          "Organize a defesa: preliminares → mérito (atipicidade) → subsidiárias (proporcionalidade da multa).",
        ],
        minimos: ["Quadro conduta imputada × tese de defesa × prova × precedente", "Preliminares viáveis com fundamento", "Precedentes do TRE-PE/TSE citados com trecho exato", "Avaliação de risco (multa provável × improvável) e recomendação"],
        criterio: "Uma boa resposta me permite protocolar a defesa no prazo de 2 dias cobrindo toda conduta imputada, sem tese genérica.",
      },
      {
        id: "representacao", ico: "⚡", tit: "Representação Eleitoral (autor)", prazo: "rito 23.608",
        desc: "Elaborar representação por propaganda antecipada ou irregular contra adversário.",
        base: "Legitimidade: partido, coligação, federação, candidato e MP Eleitoral. Rito da Res.-TSE 23.608/2019 (defesa em 2 dias, decisão célere). Em propaganda antecipada, o pedido é multa (art. 36, § 3º, da Lei 9.504/97) + remoção de conteúdo.",
        papel: "Você é um advogado eleitoralista sênior, encarregado de estruturar uma REPRESENTAÇÃO eleitoral robusta, com pedido liminar de remoção de conteúdo.",
        descobrir: ["Enquadramento típico exato de cada conduta", "Prova mínima suficiente (autenticidade e autoria)", "Pedido explícito de voto ou magnitude equivalente", "Fundamentos para a liminar (urgência do dano)", "Precedentes favoráveis nas fontes", "Valor de multa pedido em casos análogos"],
        tarefa: [
          "Organize cronologicamente as condutas do representado: publicação, data, plataforma, conteúdo, alcance e indícios de impulsionamento.",
          "Enquadre cada conduta no dispositivo exato (art. 36 e 36-A da Lei 9.504/97; Res.-TSE 23.610/2019), justificando o porquê de ser propaganda antecipada ou irregular — e descartando as condutas fracas.",
          "Verifique a suficiência da prova de cada conduta: autenticidade, autoria, prévio conhecimento; aponte o que precisa de ata notarial ou registro adicional.",
          "Selecione nas fontes os precedentes do TRE-PE e do TSE que condenaram condutas análogas, com o trecho exato e o valor da multa aplicada.",
          "Estruture o pedido liminar: probabilidade do direito, perigo da demora (continuidade da exposição) e ordem de remoção específica (URLs).",
          "Monte o pedido final: multa (com parâmetro dos precedentes), remoção definitiva e demais cominações.",
        ],
        minimos: ["Tabela conduta × dispositivo violado × prova × precedente com multa aplicada", "Ranking das condutas por força probatória (protocolar só as fortes)", "Minuta do pedido liminar com URLs específicas", "Parâmetros de multa extraídos dos precedentes carregados"],
        criterio: "Uma boa resposta separa o que rende condenação do que rende improcedência — e entrega a espinha dorsal da representação com prova e precedente.",
      },
      {
        id: "recurso-ele", ico: "📜", tit: "Recurso / Agravo Interno", prazo: "1 a 3 dias",
        desc: "Contra decisão monocrática ou acórdão em representação — prazos curtíssimos, confira o rito.",
        base: "Regra geral dos recursos eleitorais: <b>3 dias</b> (art. 258 do Código Eleitoral). Nas representações da Lei 9.504/97: <b>24 horas</b> (art. 96, § 8º). Agravo interno contra monocrática de relator no TRE: <b>3 dias</b> (art. 19 da Res.-TSE 23.608/2019). Identifique o rito ANTES de contar o prazo.",
        papel: "Você é um advogado eleitoralista sênior, especialista em recursos, encarregado de estruturar RECURSO ou AGRAVO INTERNO contra decisão desfavorável em representação eleitoral.",
        descobrir: D_REC,
        tarefa: [
          "Identifique o rito e o prazo aplicável ao caso concreto (art. 96, § 8º, da Lei 9.504/97 × art. 258 do CE × art. 19 da Res. 23.608) e diga qual é, com fundamento.",
          "Disseque a decisão recorrida: cada fundamento, a prova em que se apoiou e o pedido que acolheu/rejeitou.",
          "Confronte cada fundamento com as provas e precedentes carregados, apontando error in judicando e omissões.",
          "Verifique se a decisão destoa da jurisprudência dominante do TSE carregada no notebook (art. 36-A, liberdade de expressão, prévio conhecimento).",
          "Avalie efeito suspensivo/tutela recursal: risco de dano irreparável enquanto o recurso não é julgado.",
          "Monte a matriz recursal: argumento × probabilidade de êxito × precedente, com recomendação de ordem.",
        ],
        minimos: ["Indicação expressa do prazo e do recurso cabível no caso", "Quadro fundamento da decisão × contra-argumento × fonte", "Precedentes divergentes com trecho exato", "Recomendação sobre pedido de efeito suspensivo"],
        criterio: "Uma boa resposta me diz qual recurso cabe, em quanto tempo, e entrega os três argumentos mais fortes prontos para a peça.",
      },
      {
        id: "embargos-ele", ico: "🔍", tit: "Embargos de Declaração", prazo: "3 dias",
        desc: "Omissão, contradição, obscuridade ou erro material — art. 275 do Código Eleitoral.",
        base: "Prazo de <b>3 dias</b> (art. 275 do Código Eleitoral, red. CPC/2015). Interrompem o prazo recursal. Foco duplo: sanar vício real e prequestionar para instância superior.",
        papel: "Você é um advogado eleitoralista sênior, encarregado de estruturar EMBARGOS DE DECLARAÇÃO contra decisão do TRE-PE, com foco em vícios reais e prequestionamento.",
        descobrir: ["Teses da defesa não enfrentadas (omissão)", "Contradições internas do acórdão", "Obscuridade no alcance da decisão", "Erro material", "Prequestionamento para recurso ao TSE", "Risco de multa por protelação"],
        tarefa: [
          "Compare o acórdão/decisão com a peça da parte: liste toda tese relevante não enfrentada.",
          "Identifique contradições internas (fundamentação × dispositivo; premissa × conclusão) com os trechos exatos.",
          "Aponte obscuridades sobre o alcance da condenação (valor da multa, solidariedade, abrangência da remoção).",
          "Verifique erros materiais cotejando com os autos carregados.",
          "Indique o que precisa ficar prequestionado para eventual recurso especial eleitoral ao TSE.",
          "Redija o núcleo de cada vício: trecho da decisão × trecho da peça ignorada × efeito pretendido.",
        ],
        minimos: ["Tabela vício × trecho exato × efeito pretendido", "Hierarquia dos vícios", "Dispositivos a prequestionar expressamente", "Avaliação do risco de multa protelatória"],
        criterio: "Uma boa resposta transforma o acórdão numa lista enxuta de vícios embargáveis com potencial real de efeito modificativo ou prequestionador.",
      },
      {
        id: "respe", ico: "🎯", tit: "Recurso Especial Eleitoral (TSE)", prazo: "3 dias",
        desc: "Contra acórdão do TRE-PE — art. 276, I, do Código Eleitoral. Violação de lei ou dissídio.",
        base: 'Prazo de <b>3 dias</b> da publicação do acórdão (art. 276, § 1º, do Código Eleitoral). Cabimento (art. 276, I): decisão proferida contra expressa disposição de lei ("a") ou dissídio na interpretação de lei entre dois ou mais tribunais eleitorais ("b"). Exige prequestionamento e questão de direito — o TSE não reexamina fatos e provas (Súmula 24/TSE). Nas representações da Lei 9.504/97, os recursos internos correm em <b>24 horas</b> (art. 96, § 8º) — confira o rito do caso.',
        papel: "Você é um advogado eleitoralista sênior especialista em recursos ao TSE, encarregado de avaliar a viabilidade e estruturar um RECURSO ESPECIAL ELEITORAL.",
        descobrir: ["Hipótese de cabimento (violação de lei × dissídio)", "Prequestionamento de cada questão", "Risco de reexame de fatos/provas (Súmula 24/TSE)", "Paradigmas para o cotejo analítico", "Jurisprudência atual do TSE sobre o tema", "Efeito suspensivo / tutela cautelar no TSE"],
        tarefa: [
          "Identifique o prazo e o rito aplicáveis ao caso concreto (3 dias do art. 276, § 1º, do CE, ou o rito especial da representação) e diga qual é, com fundamento.",
          "Aponte cada dispositivo de lei violado pelo acórdão regional, com o trecho exato da violação e a tese jurídica correspondente.",
          "Verifique o prequestionamento: onde o TRE enfrentou (ou se omitiu sobre) cada questão — e se cabem embargos prequestionadores antes do REspe.",
          "Teste cada tese contra a Súmula 24 do TSE: é questão de direito puro ou reexame de prova? Descarte as teses que não sobrevivem.",
          "Se dissídio: monte o cotejo analítico com acórdãos paradigmas de outros TREs ou do TSE carregados — similitude fática + soluções divergentes.",
          "Levante a jurisprudência atual do TSE sobre o tema e avalie pedido de efeito suspensivo ou tutela cautelar para sustar os efeitos do acórdão.",
        ],
        minimos: ["Indicação expressa do prazo e do rito aplicáveis", "Quadro dispositivo violado × trecho do acórdão × prequestionamento", "Análise de risco de reexame de prova tese a tese", "Parecer honesto de admissibilidade: sobe × não sobe"],
        criterio: "Uma boa resposta separa violação de lei de inconformismo com a prova — e me diz, dentro do prazo de 3 dias, se o REspe tem chance real.",
      },
      {
        id: "agravo-respe", ico: "🔓", tit: "Agravo — Denegação de REspe", prazo: "3 dias",
        desc: "Contra a decisão que nega seguimento ao recurso especial — art. 279 do Código Eleitoral.",
        base: "Prazo de <b>3 dias</b>, nos próprios autos (art. 279 do Código Eleitoral), contra a decisão do presidente do TRE que denega seguimento ao REspe. Exige impugnação de TODOS os fundamentos da denegação. O presidente não pode negar seguimento ao agravo (art. 279, § 5º).",
        papel: "Você é um advogado eleitoralista sênior especialista em recursos ao TSE, encarregado de estruturar o AGRAVO contra a denegação de seguimento do recurso especial eleitoral.",
        descobrir: ["Fundamentos da denegação, um a um", "Impugnação específica de cada fundamento", "Óbices invocados (Súmula 24/TSE, prequestionamento) e como contorná-los", "Reafirmação das razões do REspe", "Precedentes do TSE sobre os óbices", "Tutela de urgência no TSE (se o caso)"],
        tarefa: [
          "Liste TODOS os fundamentos da decisão de denegação do REspe.",
          "Construa a impugnação específica de cada um — fundamento não atacado leva ao não conhecimento do agravo.",
          "Confronte os óbices invocados (reexame de prova, ausência de prequestionamento, intempestividade) com a jurisprudência do TSE carregada.",
          "Reafirme, em síntese, as razões do recurso especial denegado.",
          "Avalie a viabilidade real da subida e eventual pedido de tutela cautelar ao TSE para sustar os efeitos do acórdão.",
          "Estruture a peça: tempestividade → impugnação da denegação, ponto a ponto → razões do REspe → pedidos.",
        ],
        minimos: ["Quadro fundamento da denegação × impugnação específica", "Síntese das razões do REspe", "Precedentes do TSE sobre os óbices, com trecho exato", "Parecer de viabilidade da subida"],
        criterio: "Uma boa resposta não deixa nenhum fundamento da denegação sem ataque — condição para o agravo sequer ser conhecido no TSE.",
      },
      {
        id: "contrarrazoes-ele", ico: "🤺", tit: "Contrarrazões Eleitorais", prazo: "prazo do recurso",
        desc: "Responder recurso, agravo ou REspe adverso — inadmissibilidade primeiro, mérito depois.",
        base: "Prazo igual ao do recurso respondido (regra geral: <b>3 dias</b> — art. 276 do CE; nas representações da Lei 9.504/97: <b>24 horas</b> — art. 96, § 8º). Dupla função: preliminares de inadmissibilidade do recurso adverso (tempestividade, dialeticidade, Súmula 24/TSE) + defesa do julgado favorável.",
        papel: "Você é um advogado eleitoralista sênior, encarregado de estruturar CONTRARRAZÕES que ataquem a admissibilidade do recurso adverso e blindem a decisão favorável.",
        descobrir: ["Prazo e rito aplicáveis às contrarrazões", "Vícios de admissibilidade do recurso adverso", "Súmula 24/TSE contra o recorrente (reexame de prova)", "Capítulos não impugnados (preclusão)", "Inovação recursal a denunciar", "Jurisprudência do TSE/TRE-PE que blinda o julgado"],
        tarefa: [
          "Identifique o prazo e o rito aplicáveis às contrarrazões no caso concreto (art. 276 do CE × art. 96, § 8º, da Lei 9.504/97) e diga qual é.",
          "Faça o juízo de admissibilidade do recurso adverso: tempestividade (atenção à contagem no período eleitoral), cabimento, dialeticidade e — se REspe — os óbices da Súmula 24/TSE.",
          "Identifique os capítulos da decisão NÃO impugnados pelo recorrente e a preclusão correspondente.",
          "Denuncie inovações recursais: teses e provas que não constaram da fase anterior.",
          "Reforce cada fundamento da decisão favorável com as provas e a jurisprudência do TSE/TRE-PE carregadas.",
          "Estruture: preliminares de não conhecimento → resposta a cada razão recursal → prequestionamento defensivo (se conveniente) → pedidos.",
        ],
        minimos: ["Indicação do prazo e rito aplicáveis", "Checklist de admissibilidade do recurso adverso (com os óbices sumulares)", "Quadro razão recursal × resposta × fonte", "Estrutura sugerida da peça"],
        criterio: "Uma boa resposta usa os óbices de admissibilidade — a arma mais barata do contencioso eleitoral — antes de discutir o mérito.",
      },
      {
        id: "pesquisa", ico: "📊", tit: "Impugnação de Pesquisa Eleitoral", prazo: "Res. 23.600",
        desc: "Vícios de registro e metodologia — art. 33 da Lei 9.504/97 e Res.-TSE 23.600/2019.",
        base: "Registro obrigatório até <b>5 dias antes</b> da divulgação (art. 33 da Lei 9.504/97; Res.-TSE 23.600/2019). A representação exige <b>indicação objetiva do vício + instrução ou prova técnica</b>. Divulgação sem registro: multa do art. 33, § 3º.",
        papel: "Você é um advogado eleitoralista sênior com domínio de metodologia estatística de pesquisas, encarregado de analisar a viabilidade de impugnação de pesquisa eleitoral e estruturar a representação.",
        descobrir: ["Vícios de registro (PesqEle): dados faltantes ou inconsistentes", "Plano amostral × população real (IBGE/TSE)", "Margem de erro, nível de confiança e ponderação", "Metodologia de coleta e questionário (indução)", "Divergência com séries históricas carregadas", "Viabilidade: vale a pena representar?"],
        tarefa: [
          "Confira o registro no PesqEle: prazo de 5 dias, contratante, valor, período de coleta, plano amostral, verificação — aponte toda inconsistência.",
          "Analise o plano amostral contra os dados oficiais carregados (IBGE, eleitorado do TSE): estratos, cotas, distribuição geográfica.",
          "Avalie margem de erro e nível de confiança declarados × tamanho da amostra: os números fecham matematicamente?",
          "Examine o questionário e a metodologia de coleta em busca de perguntas indutoras ou desequilíbrio.",
          "Compare o resultado com as séries históricas e demais pesquisas carregadas: a discrepância é estatisticamente explicável?",
          "Conclua com parecer objetivo: há vício impugnável com prova suficiente? Qual pedido fazer (multa, proibição de divulgação, direito de resposta)?",
        ],
        minimos: ["Checklist de conformidade do registro item a item", "Análise técnica da amostra e da margem de erro", "Parecer de viabilidade (impugnar × não impugnar) fundamentado", "Se viável: esqueleto da representação com a prova técnica exigida"],
        criterio: "Uma boa resposta me diz se a impugnação sobrevive à exigência de prova técnica do rito — antes de eu gastar o prazo do escritório com peça inviável.",
      },
      {
        id: "juris-ele", ico: "⚖️", tit: "Cruzamento de Jurisprudência", prazo: "análise",
        desc: "Tendências do TRE-PE e do TSE nos acórdãos carregados — argumentos vencedores e placares.",
        base: "Análise transversal dos acórdãos e decisões carregados no notebook: padrões decisórios, placares por relator, evolução do entendimento sobre propaganda antecipada, pesquisa e direito de resposta.",
        papel: "Você é um advogado eleitoralista sênior com expertise em análise jurisprudencial estratégica, encarregado de cruzar as decisões carregadas para orientar a atuação do escritório.",
        descobrir: ["Argumento mais frequentemente vencedor", "Padrões por relator", "Tendência de mudança de entendimento", "Divergências internas no TRE-PE", "Ratio decidendi recorrente", "Parâmetros de multa aplicados"],
        tarefa: [
          "Leia integralmente cada decisão/acórdão carregado e extraia: partes, conduta, tese vencedora, placar, relator e resultado.",
          "Classifique cada caso por resultado (procedência, improcedência, parcial) e por tema (art. 36-A, impulsionamento, pesquisa, direito de resposta).",
          "Cruze argumentos × resultados: quais teses de defesa efetivamente prevalecem e em que contexto fático.",
          "Mapeie padrões por relator: rigor, teses acolhidas, valores de multa.",
          "Identifique divergências internas e sinais de virada de entendimento (composição, precedente novo do TSE).",
          "Produza recomendação estratégica: quais teses sustentar, quais evitar, e o que esperar de cada relator.",
        ],
        minimos: ["Tabela acórdão × conduta × tese vencedora × placar × relator", "Ranking de argumentos por taxa de êxito", "Os 3 precedentes mais paradigmáticos com trecho da ementa", "Recomendação estratégica final para as próximas peças"],
        criterio: "Uma boa resposta me permite prever, com base em dados, o resultado provável da próxima representação — e escolher a tese certa para cada relator.",
      },
    ],
  },
  {
    id: "con",
    nome: "Contencioso",
    tag: "CÍVEL · TRABALHISTA · EXECUÇÕES",
    icon: "⚖️",
    titulo: "Qual peça do contencioso?",
    sub: "Ações do processo civil (CPC/2015) e da esfera trabalhista (CLT), execuções — inclusive fiscais (Lei 6.830/80) — e a cadeia recursal completa: TJPE, TRF5, STJ (REsp), STF (RExt), TRT6 e TST.",
    fields: F_CON,
    cen: [
      {
        id: "inicial-civel", ico: "✍️", tit: "Petição Inicial Cível", prazo: "CPC art. 319",
        desc: "Estruturar a inicial com causa de pedir sólida, provas mapeadas e pedidos precisos.",
        base: "Requisitos do art. 319 do CPC. Atenção a competência, valor da causa, tutela provisória (arts. 294 e ss.) e juízo 100% digital.",
        papel: "Você é um advogado cível sênior, encarregado de estruturar uma PETIÇÃO INICIAL tecnicamente sólida a partir das provas e documentos carregados.",
        descobrir: ["Fundamentos jurídicos mais fortes para o pedido", "Provas disponíveis × provas faltantes", "Cabimento de tutela de urgência/evidência", "Valor da causa e liquidação do pedido", "Riscos de improcedência e preliminares do réu", "Precedentes favoráveis nas fontes"],
        tarefa: [
          "Organize a narrativa fática em ordem cronológica, ancorando cada fato relevante em um documento carregado.",
          "Identifique a causa de pedir e o enquadramento jurídico mais forte (e as alternativas subsidiárias).",
          "Mapeie prova por prova: o que cada documento comprova e o que ainda falta produzir (e como).",
          "Avalie tutela provisória: urgência ou evidência, com os elementos concretos das fontes.",
          "Antecipe as defesas prováveis do réu e como a inicial já pode neutralizá-las.",
          "Estruture os pedidos em ordem lógica, com liquidação/estimativa de valores baseada nos documentos.",
        ],
        minimos: ["Linha do tempo fática com prova por fato", "Enquadramento jurídico principal + subsidiários", "Quadro pedido × fundamento × prova", "Antecipação das defesas do réu e resposta a cada uma"],
        criterio: "Uma boa resposta me entrega o esqueleto completo da inicial: fatos provados, tese, pedidos e valores — sem lacuna probatória escondida.",
      },
      {
        id: "contestacao-civel", ico: "🛡️", tit: "Contestação Cível", prazo: "15 dias úteis",
        desc: "Defesa completa: preliminares, prejudiciais e mérito — art. 335 do CPC.",
        base: "Prazo de <b>15 dias úteis</b> (art. 335 do CPC). Concentração da defesa (art. 336) e ônus da impugnação especificada (art. 341): fato não impugnado presume-se verdadeiro.",
        papel: "Você é um advogado cível sênior, encarregado de estruturar uma CONTESTAÇÃO completa sob a regra da concentração da defesa e da impugnação especificada.",
        descobrir: ["Preliminares do art. 337 cabíveis", "Prejudiciais: prescrição e decadência", "Fatos da inicial refutáveis com prova", "Fragilidades probatórias do autor", "Teses de mérito mais fortes", "Cabimento de reconvenção"],
        tarefa: [
          "Liste TODOS os fatos alegados na inicial e classifique: incontroverso, controvertido com prova em contrário, controvertido sem prova.",
          "Verifique uma a uma as preliminares do art. 337 do CPC aplicáveis ao caso.",
          "Analise prescrição e decadência com as datas exatas extraídas dos documentos.",
          "Para cada fato controvertido, indique a prova carregada que o refuta (impugnação especificada — art. 341).",
          "Construa as teses de mérito com a legislação e os precedentes carregados.",
          "Avalie reconvenção e pedidos contrapostos; estruture a ordem da peça.",
        ],
        minimos: ["Tabela fato da inicial × impugnação × prova", "Preliminares e prejudiciais com fundamento e datas", "Teses de mérito hierarquizadas", "Alerta para todo fato que ficaria incontroverso sem impugnação"],
        criterio: "Uma boa resposta garante que nenhum fato da inicial passe sem impugnação especificada e que nenhuma preliminar viável fique de fora.",
      },
      {
        id: "recursos-civel", ico: "📜", tit: "Apelação / Contrarrazões", prazo: "15 dias úteis",
        desc: "Atacar ou defender a sentença — arts. 1.009 e ss. do CPC.",
        base: "Prazo de <b>15 dias úteis</b> (art. 1.003, § 5º, do CPC). Efeito suspensivo como regra na apelação (art. 1.012). Dialeticidade: impugnação específica de cada fundamento da sentença.",
        papel: "Você é um advogado cível sênior, especialista em recursos, encarregado de estruturar APELAÇÃO (ou contrarrazões) com impugnação específica de cada fundamento da sentença.",
        descobrir: D_REC,
        tarefa: [
          "Disseque a sentença: cada fundamento decisivo, a prova que o sustentou e o pedido que acolheu/rejeitou.",
          "Para cada fundamento, formule a impugnação específica (dialeticidade), com a prova ou norma que o infirma.",
          "Verifique error in procedendo: cerceamento de defesa, julgamento fora dos limites, fundamentação deficiente (art. 489, § 1º).",
          "Confronte a sentença com os precedentes carregados, incluindo os qualificados (art. 927) que o juízo deixou de seguir.",
          "Avalie questões de sucumbência, honorários e efeito suspensivo.",
          "Monte a matriz recursal: capítulo da sentença × argumento × probabilidade de reforma.",
        ],
        minimos: ["Quadro capítulo da sentença × impugnação × prova/norma × precedente", "Vícios processuais identificados", "Análise de sucumbência e honorários", "Recomendação: apelar de tudo × apelar parcialmente"],
        criterio: "Uma boa resposta cobre todos os capítulos desfavoráveis com impugnação específica — sem deixar nenhum trânsito em julgado por omissão.",
      },
      {
        id: "agravo-instrumento", ico: "⚡", tit: "Agravo de Instrumento", prazo: "15 dias úteis",
        desc: "Contra decisão interlocutória — art. 1.015 do CPC e Tema 988/STJ (taxatividade mitigada). TJPE / TRF5.",
        base: "Prazo de <b>15 dias úteis</b> (art. 1.003, § 5º, do CPC). Hipóteses do art. 1.015 — rol de <b>taxatividade mitigada</b> (Tema 988/STJ): cabe também quando houver urgência decorrente da inutilidade do julgamento da questão só na apelação. Requisitos da petição: art. 1.016. Efeito suspensivo/tutela recursal: art. 1.019, I.",
        papel: "Você é um advogado cível sênior, especialista em recursos, encarregado de avaliar o cabimento e estruturar um AGRAVO DE INSTRUMENTO contra decisão interlocutória.",
        descobrir: ["Cabimento: inciso do art. 1.015 × Tema 988/STJ", "Vícios da decisão interlocutória", "Fundamentos para efeito suspensivo / tutela recursal", "Prejuízo se a questão só for revista na apelação", "Precedentes do tribunal de destino (TJPE/TRF5)", "Estratégia: agravar × aguardar a apelação"],
        tarefa: [
          "Verifique o cabimento: enquadre a decisão em um inciso do art. 1.015 do CPC ou demonstre a urgência da taxatividade mitigada (Tema 988/STJ) — e diga com franqueza se não couber.",
          "Disseque a decisão agravada: fundamentos, provas consideradas e o que exatamente foi deferido ou indeferido.",
          "Confronte cada fundamento com os autos e a legislação carregados, apontando error in judicando e error in procedendo.",
          "Construa o pedido de efeito suspensivo ou tutela antecipada recursal (art. 1.019, I): probabilidade do direito + risco de dano grave, com os elementos concretos das fontes.",
          "Levante nas fontes os precedentes do tribunal de destino (TJPE ou TRF5) sobre a mesma questão.",
          "Estruture a peça: cabimento → síntese do caso → mérito → tutela recursal → pedidos.",
        ],
        minimos: ["Parecer de cabimento (art. 1.015 × Tema 988) fundamentado", "Quadro fundamento da decisão × contra-argumento × fonte", "Núcleo do pedido de efeito suspensivo com elementos concretos", "Precedentes do tribunal de destino com trecho exato"],
        criterio: "Uma boa resposta me diz se o agravo é cabível e entrega os fundamentos prontos — inclusive a tutela recursal — sem risco de inadmissão por descabimento.",
      },
      {
        id: "agravo-interno", ico: "🔁", tit: "Agravo Interno", prazo: "15 dias úteis",
        desc: "Contra decisão monocrática de relator — art. 1.021 do CPC c/c regimentos do TJPE e do TRF5.",
        base: "Prazo de <b>15 dias úteis</b> (art. 1.021 do CPC c/c o Regimento Interno do tribunal — no TRF5, art. 200 do RI; no TJPE, na forma do próprio art. 1.021). Exige impugnação <b>específica</b> dos fundamentos da decisão agravada (§ 1º). Multa de 1% a 5% do valor da causa se declarado manifestamente inadmissível ou improcedente em votação unânime (§ 4º).",
        papel: "Você é um advogado cível sênior, especialista em recursos, encarregado de estruturar um AGRAVO INTERNO contra decisão monocrática de relator no TJPE, TRF5 ou tribunal superior.",
        descobrir: ["Fundamento do julgamento monocrático (art. 932 do CPC)", "Distinguishing do precedente aplicado", "Impugnação específica de cada fundamento (§ 1º)", "Vícios formais do julgamento monocrático", "Risco da multa do § 4º", "Interpor × não interpor"],
        tarefa: [
          "Identifique o fundamento exato da decisão monocrática (art. 932 do CPC: súmula, tema repetitivo, jurisprudência dominante, inadmissibilidade) e verifique se foi aplicado corretamente.",
          "Construa o distinguishing: por que o precedente ou tema invocado não se aplica aos fatos destes autos, com o cotejo dos trechos.",
          "Impugne ESPECIFICAMENTE cada fundamento da decisão (art. 1.021, § 1º) — liste-os um a um e ataque todos.",
          "Verifique vícios formais: julgamento monocrático fora das hipóteses do art. 932, ausência de oportunidade de sanar vício (art. 932, parágrafo único).",
          "Avalie o risco da multa do § 4º e pondere objetivamente se vale interpor.",
          "Estruture a peça: pedido de reconsideração e, subsidiariamente, submissão ao colegiado.",
        ],
        minimos: ["Lista fundamento da monocrática × impugnação específica", "Distinguishing do precedente aplicado com trechos", "Avaliação do risco de multa (§ 4º)", "Recomendação final: interpor × não interpor"],
        criterio: "Uma boa resposta garante impugnação específica de todos os fundamentos — sem o que o agravo nem é conhecido — e me diz se o risco compensa.",
      },
      {
        id: "resp", ico: "🎯", tit: "Recurso Especial (STJ)", prazo: "15 dias úteis",
        desc: "Violação a lei federal ou dissídio — art. 105, III, da CF. Prequestionamento e Súmulas 5 e 7 do STJ.",
        base: "Prazo de <b>15 dias úteis</b> (art. 1.003, § 5º, do CPC). Cabimento: art. 105, III, da CF. Exige <b>prequestionamento</b> (inclusive ficto — art. 1.025 do CPC), esgotamento da instância ordinária e questão exclusivamente de direito (Súmulas 5 e 7 do STJ vedam reexame de contrato e de prova). Interposto perante a presidência/vice do TJPE ou TRF5, que faz o juízo de admissibilidade (art. 1.030).",
        papel: "Você é um advogado sênior especialista em recursos aos tribunais superiores, encarregado de avaliar a viabilidade e estruturar um RECURSO ESPECIAL ao STJ.",
        descobrir: ["Hipótese de cabimento do art. 105, III", "Prequestionamento de cada dispositivo", "Risco das Súmulas 5 e 7 do STJ tese a tese", "Dissídio jurisprudencial (cotejo analítico)", "Temas repetitivos aplicáveis", "Chances no juízo de admissibilidade da origem"],
        tarefa: [
          "Identifique cada dispositivo de lei federal contrariado ou negado de vigência pelo acórdão, com o trecho exato da violação.",
          "Verifique o prequestionamento de cada dispositivo: onde o acórdão (ou os embargos de declaração — art. 1.025) enfrentou a questão.",
          "Teste cada tese contra as Súmulas 5 e 7 do STJ: é questão de direito puro ou exigiria reexame de prova/contrato? Seja rigoroso e descarte as teses fracas.",
          "Se houver dissídio: monte o cotejo analítico (art. 1.029, § 1º) entre o acórdão recorrido e os paradigmas carregados — similitude fática + soluções jurídicas divergentes.",
          "Confronte com os temas repetitivos e súmulas do STJ carregados: o que favorece, o que impede, o que sobresta.",
          "Antecipe o juízo de admissibilidade na origem (art. 1.030): óbices prováveis e como blindar cada um.",
        ],
        minimos: ["Quadro dispositivo violado × trecho do acórdão × prequestionamento", "Análise de risco Súmula 7 tese a tese", "Cotejo analítico do dissídio (se for o caso)", "Parecer honesto de admissibilidade: sobe × não sobe"],
        criterio: "Uma boa resposta separa tese de direito de inconformismo com a prova — e me diz quais capítulos têm chance real de conhecimento no STJ.",
      },
      {
        id: "rext", ico: "🏛️", tit: "Recurso Extraordinário (STF)", prazo: "15 dias úteis",
        desc: "Ofensa direta à Constituição — art. 102, III, da CF. Repercussão geral obrigatória.",
        base: "Prazo de <b>15 dias úteis</b> (art. 1.003, § 5º, do CPC). Cabimento: art. 102, III, da CF — exige ofensa <b>DIRETA</b> à Constituição (ofensa reflexa não autoriza o recurso). Preliminar formal e fundamentada de <b>repercussão geral</b> (art. 102, § 3º, da CF; art. 1.035 do CPC). Juízo de admissibilidade na origem (art. 1.030).",
        papel: "Você é um advogado sênior especialista em jurisdição constitucional, encarregado de avaliar a viabilidade e estruturar um RECURSO EXTRAORDINÁRIO ao STF.",
        descobrir: ["Ofensa direta × reflexa à Constituição", "Preliminar de repercussão geral", "Temas de repercussão geral aplicáveis (e seu estado)", "Prequestionamento da questão constitucional", "Sobrestamento por tema pendente", "Estratégia: RExt e REsp simultâneos"],
        tarefa: [
          "Identifique a questão constitucional: o dispositivo da CF violado e por que a ofensa é DIRETA, e não dependente do exame prévio de norma infraconstitucional.",
          "Verifique o prequestionamento da questão constitucional no acórdão recorrido (e a necessidade de embargos prequestionadores).",
          "Levante nos materiais os temas de repercussão geral do STF aplicáveis — favoráveis e contrários — com a situação atual de cada um (julgado, pendente, com sobrestamento).",
          "Redija o núcleo da preliminar de repercussão geral: relevância econômica, política, social ou jurídica + transcendência do caso concreto.",
          "Avalie a interposição simultânea de REsp e RExt e a ordem de julgamento (art. 1.031).",
          "Antecipe a admissibilidade na origem e a jurisprudência defensiva do STF sobre o tema.",
        ],
        minimos: ["Demonstração da ofensa direta (ou alerta honesto de que é reflexa)", "Minuta do núcleo da preliminar de repercussão geral", "Temas de RG aplicáveis com situação atual", "Parecer de viabilidade"],
        criterio: "Uma boa resposta me diz se existe questão constitucional direta de verdade — antes de eu gastar prazo com recurso fadado à inadmissão.",
      },
      {
        id: "aresp", ico: "🔓", tit: "Agravo em REsp / RExt", prazo: "15 dias úteis",
        desc: "Contra a inadmissão do REsp/RExt na origem — art. 1.042 do CPC. Atacar todos os fundamentos.",
        base: "Art. 1.042 do CPC: cabe contra a decisão da presidência/vice do TJPE ou TRF5 que <b>inadmite</b> REsp ou RExt — salvo quando fundada em tema repetitivo ou repercussão geral, hipótese em que o cabível é <b>agravo interno na origem</b> (art. 1.030, § 2º). Prazo de <b>15 dias úteis</b>, nos próprios autos, sem preparo. Exige impugnação de TODOS os fundamentos da inadmissão (lógica da Súmula 182/STJ).",
        papel: "Você é um advogado sênior especialista em recursos aos tribunais superiores, encarregado de identificar a via correta e estruturar o AGRAVO contra a inadmissão de REsp ou RExt.",
        descobrir: ["Via correta: AREsp/ARE (art. 1.042) × agravo interno (art. 1.030, § 2º)", "Fundamentos da inadmissão, um a um", "Impugnação específica de cada fundamento", "Óbices invocados (Súmula 7, prequestionamento...) e como contorná-los", "Reafirmação das razões do recurso principal", "Viabilidade real da subida"],
        tarefa: [
          "Primeiro, identifique o fundamento da inadmissão: se foi aplicação de tema repetitivo ou repercussão geral, o cabível é agravo interno na origem (art. 1.030, § 2º) — NÃO o agravo do art. 1.042. Diga expressamente qual é a via.",
          "Liste TODOS os fundamentos da decisão de inadmissão, um a um.",
          "Construa a impugnação específica de cada fundamento — um único fundamento sem ataque leva ao não conhecimento (Súmula 182/STJ).",
          "Confronte os óbices invocados (Súmula 7, ausência de prequestionamento, deficiência de fundamentação) com a jurisprudência do STJ/STF carregada.",
          "Reafirme, em síntese, as razões do recurso inadmitido.",
          "Dê o parecer de viabilidade: o óbice é contornável ou o recurso morre aqui?",
        ],
        minimos: ["Indicação da via correta (art. 1.042 × art. 1.030, § 2º) com fundamento", "Quadro fundamento da inadmissão × impugnação específica", "Síntese das razões do recurso principal", "Parecer de viabilidade honesto"],
        criterio: "Uma boa resposta garante que nenhum fundamento da inadmissão fique sem ataque — e me poupa de interpor a via errada.",
      },
      {
        id: "rr-airr", ico: "🛤️", tit: "Recurso de Revista / AIRR", prazo: "8 dias",
        desc: "Ao TST contra acórdão do TRT — art. 896 da CLT. Transcendência e requisitos do § 1º-A.",
        base: 'Recurso de Revista: <b>8 dias</b> (art. 896 da CLT) — violação de lei/CF, divergência jurisprudencial ou contrariedade a súmula do TST/OJ. Exige <b>transcendência</b> (art. 896-A), prequestionamento (Súmula 297/TST) e a transcrição do trecho da decisão recorrida (art. 896, § 1º-A). AIRR: <b>8 dias</b> contra o despacho que denega seguimento (art. 897, "b", da CLT).',
        papel: "Você é um advogado trabalhista sênior especialista em recursos ao TST, encarregado de estruturar RECURSO DE REVISTA (ou AIRR) com todos os requisitos formais cumpridos.",
        descobrir: ["Enquadramento nas alíneas do art. 896", "Transcendência (econômica, política, social, jurídica)", "Prequestionamento — Súmula 297/TST", "Transcrições obrigatórias do § 1º-A", "Divergência válida (Súmula 337/TST)", "Risco da Súmula 126/TST (reexame de prova)"],
        tarefa: [
          "Enquadre cada tese em uma alínea do art. 896 da CLT (violação literal, divergência jurisprudencial ou contrariedade a súmula/OJ), indicando o dispositivo ou verbete exato.",
          "Demonstre a transcendência de cada tema (art. 896-A): qual espécie e por quê, com os dados do caso.",
          "Confira o prequestionamento (Súmula 297/TST) e monte a transcrição obrigatória do trecho da decisão recorrida que consubstancia o prequestionamento (art. 896, § 1º-A, I).",
          "Se divergência: selecione arestos válidos conforme a Súmula 337/TST e faça o cotejo analítico.",
          "Teste cada tese contra a Súmula 126/TST: exige reexame de fatos e provas? Descarte as que exigirem.",
          "Se AIRR: liste os fundamentos da denegação e construa a impugnação específica de cada um, com as transcrições exigidas.",
        ],
        minimos: ["Quadro tema × alínea do art. 896 × transcendência × prequestionamento", "Transcrições obrigatórias do § 1º-A já montadas", "Análise de risco Súmula 126/TST tese a tese", "Checklist de pressupostos extrínsecos (prazo, depósito, custas)"],
        criterio: "Uma boa resposta entrega a revista com os requisitos formais do § 1º-A cumpridos — exatamente onde a maioria dos recursos morre no TST.",
      },
      {
        id: "contrarrazoes", ico: "🤺", tit: "Contrarrazões (qualquer recurso)", prazo: "prazo do recurso",
        desc: "Responder apelação, agravo, REsp, RExt ou recurso trabalhista — inadmissibilidade + defesa do julgado.",
        base: "Prazo igual ao do recurso respondido (regra cível: <b>15 dias úteis</b> — art. 1.003, § 5º, do CPC; trabalhista: 8 dias). Dupla função: preliminares de <b>inadmissibilidade</b> do recurso adverso + defesa do julgado no mérito. Honorários recursais: art. 85, § 11, do CPC.",
        papel: "Você é um advogado sênior especialista em recursos, encarregado de estruturar CONTRARRAZÕES que ataquem a admissibilidade do recurso adverso e blindem o julgado favorável.",
        descobrir: ["Vícios de admissibilidade do recurso adverso", "Dialeticidade: o recurso impugnou especificamente o julgado?", "Capítulos não impugnados (trânsito parcial)", "Inovação recursal a denunciar", "Precedentes que blindam o julgado", "Honorários recursais (art. 85, § 11)"],
        tarefa: [
          "Faça o juízo de admissibilidade do recurso adverso: tempestividade, preparo, cabimento, regularidade formal e dialeticidade (impugnação específica dos fundamentos do julgado).",
          "Identifique os capítulos do julgado NÃO impugnados — e o trânsito em julgado parcial correspondente.",
          "Denuncie inovações recursais: teses e documentos que não constaram da fase anterior.",
          "Reforce cada fundamento do julgado com as provas e os precedentes carregados (inclusive fundamentos autônomos não atacados que mantêm o resultado).",
          "Responda cada razão recursal, na ordem, com contra-argumento ancorado nas fontes.",
          "Estruture os pedidos: não conhecimento → desprovimento → majoração dos honorários recursais.",
        ],
        minimos: ["Checklist de admissibilidade do recurso adverso", "Quadro razão recursal × resposta × fonte", "Capítulos preclusos identificados", "Estrutura sugerida da peça com os três pedidos"],
        criterio: "Uma boa resposta tenta matar o recurso na admissibilidade antes do mérito — e não deixa nenhuma razão recursal sem resposta.",
      },
      {
        id: "trabalhista-def", ico: "👷", tit: "Contestação Trabalhista", prazo: "até a audiência",
        desc: "Defesa em reclamação trabalhista — CLT art. 847 e rito do PJe.",
        base: "Defesa apresentada <b>até a audiência</b> (art. 847 da CLT; no PJe, protocolo antes da audiência inicial). Atenção: ônus da prova (art. 818 da CLT), jornada e cartões de ponto (Súmula 338/TST), e limitação dos valores liquidados (art. 840, § 1º).",
        papel: "Você é um advogado trabalhista sênior, encarregado de estruturar a CONTESTAÇÃO do reclamado com impugnação pedido a pedido e gestão do ônus probatório.",
        descobrir: ["Pedidos liquidados × documentos de contraprova", "Distribuição do ônus da prova por pedido", "Prescrição quinquenal e bienal", "Impugnação dos cálculos da inicial", "Teses por pedido (jornada, verbas, dano moral...)", "Testemunhas e provas a produzir"],
        tarefa: [
          "Liste todos os pedidos da reclamação com os valores liquidados e o fundamento de cada um.",
          "Analise prescrição bienal e quinquenal com as datas do contrato extraídas dos documentos.",
          "Para cada pedido, defina de quem é o ônus da prova e qual documento carregado (contrato, ponto, contracheques) sustenta a defesa.",
          "Impugne especificamente os cálculos da inicial: base, reflexos, evolução salarial.",
          "Construa as teses de mérito por pedido com a CLT e a jurisprudência do TST carregadas (Súmulas e OJs).",
          "Planeje a instrução: o que provar por testemunha, o que já está documentado.",
        ],
        minimos: ["Tabela pedido × valor × ônus da prova × contraprova × tese", "Prejudiciais de prescrição com datas", "Impugnação de cálculos ponto a ponto", "Roteiro de instrução (testemunhas e depoimento pessoal)"],
        criterio: "Uma boa resposta me dá a defesa pedido a pedido, com o documento certo para cada um — e nenhum pedido respondido genericamente.",
      },
      {
        id: "recurso-trab", ico: "📮", tit: "Recurso Ordinário Trabalhista", prazo: "8 dias",
        desc: "Contra sentença trabalhista — art. 895 da CLT. Depósito recursal e custas.",
        base: "Prazo de <b>8 dias</b> (art. 895 da CLT). Pressupostos: depósito recursal e custas (art. 899). Transcendência e Súmulas do TST orientam as chances em instância superior.",
        papel: "Você é um advogado trabalhista sênior, especialista em recursos, encarregado de estruturar RECURSO ORDINÁRIO contra sentença trabalhista.",
        descobrir: D_REC,
        tarefa: [
          "Disseque a sentença: cada pedido julgado, o fundamento e a prova valorada em cada capítulo.",
          "Confronte a valoração probatória com os autos carregados: depoimentos, documentos, perícia.",
          "Verifique contrariedade a Súmulas/OJs do TST e à jurisprudência carregada.",
          "Identifique nulidades: negativa de prestação jurisdicional, cerceamento, julgamento ultra petita.",
          "Reavalie os cálculos da condenação e os parâmetros de liquidação fixados.",
          "Monte a matriz recursal por capítulo, com recomendação do que impugnar e estimativa de êxito.",
        ],
        minimos: ["Quadro capítulo × fundamento × impugnação × Súmula/OJ aplicável", "Nulidades identificadas", "Conferência dos parâmetros de condenação", "Checklist de pressupostos (depósito, custas, prazo)"],
        criterio: "Uma boa resposta cobre cada capítulo desfavorável com a Súmula ou prova certa — e não deixa pressuposto extrínseco descoberto.",
      },
      {
        id: "exec-fiscal", ico: "🏦", tit: "Defesa em Execução Fiscal", prazo: "30 dias (embargos)",
        desc: "Embargos à execução fiscal ou exceção de pré-executividade — Lei 6.830/80.",
        base: "Embargos em <b>30 dias</b> da intimação da penhora (art. 16 da LEF), exigida a garantia do juízo. Sem garantia: <b>exceção de pré-executividade</b> para matéria de ordem pública provável de plano (Súmula 393/STJ). CDA goza de presunção de liquidez e certeza — que é relativa (art. 3º da LEF).",
        papel: "Você é um advogado sênior especialista em execução fiscal, encarregado de escolher a via defensiva adequada (embargos × exceção de pré-executividade) e estruturar a peça.",
        descobrir: ["Vícios da CDA (requisitos do art. 2º, § 5º, da LEF)", "Prescrição e decadência do crédito", "Ilegitimidade passiva / redirecionamento indevido", "Excesso de execução e erro de cálculo", "Matérias de ordem pública para EPE (Súmula 393/STJ)", "Garantia do juízo: alternativas e impactos"],
        tarefa: [
          "Examine a CDA item a item contra os requisitos do art. 2º, § 5º, da LEF: origem, fundamento legal, forma de cálculo dos juros, termo inicial.",
          "Analise prescrição (constituição × ajuizamento × citação) e decadência com as datas exatas dos documentos carregados.",
          "Verifique a legitimidade passiva: redirecionamento a sócio/gestor sem os requisitos do art. 135 do CTN e da jurisprudência do STJ carregada.",
          "Aponte excesso de execução: recalcule ou confronte os valores com os documentos de pagamento/parcelamento carregados.",
          "Decida a via: o que pode ir em exceção de pré-executividade (sem garantia, prova pré-constituída) e o que exige embargos.",
          "Estruture a peça escolhida com pedidos principais e subsidiários (inclusive suspensão — art. 151 do CTN, se houver parcelamento/depósito).",
        ],
        minimos: ["Checklist de validade da CDA item a item", "Linha do tempo da prescrição com datas e marcos interruptivos", "Parecer: EPE × embargos × ambas, com fundamento", "Esqueleto da peça escolhida com pedidos"],
        criterio: "Uma boa resposta me diz qual via defensiva usar, o que cada uma cobre, e entrega a linha do tempo da prescrição pronta para a peça.",
      },
      {
        id: "cumprimento", ico: "⚙️", tit: "Execução / Cumprimento de Sentença", prazo: "15 dias úteis (impugnação)",
        desc: "Promover ou impugnar cumprimento de sentença e execução de título extrajudicial — CPC arts. 513 e ss.",
        base: "Impugnação em <b>15 dias úteis</b> após o prazo de pagamento voluntário (art. 525 do CPC). Matérias limitadas (§ 1º). Na execução de título extrajudicial: embargos em 15 dias úteis independentemente de penhora (art. 914).",
        papel: "Você é um advogado cível sênior especialista em execução, encarregado de estruturar a estratégia executiva (credor) ou a impugnação/embargos (devedor) a partir dos autos carregados.",
        descobrir: ["Liquidez e exatidão dos cálculos", "Excesso de execução (art. 525, § 1º, V)", "Impenhorabilidades e ordem de preferência", "Fato superveniente (pagamento, compensação, prescrição intercorrente)", "Patrimônio localizável e medidas atípicas (art. 139, IV)", "Estratégia de acordo × litígio"],
        tarefa: [
          "Confira o título: trânsito em julgado, liquidez, parâmetros fixados e índices aplicáveis.",
          "Recalcule ou audite os cálculos apresentados: base, correção monetária, juros, honorários, multa do art. 523.",
          "Se defesa: verifique cada matéria do art. 525, § 1º, cabível — com destaque para excesso de execução (apresentando o valor correto).",
          "Se credor: mapeie o patrimônio indicado nas fontes e as medidas executivas cabíveis (Sisbajud, Renajud, penhoras, medidas atípicas).",
          "Analise prescrição intercorrente e fatos supervenientes documentados.",
          "Recomende a estratégia: impugnar/embargar × pagar × acordar, com números.",
        ],
        minimos: ["Auditoria dos cálculos com memória própria", "Quadro matéria de defesa × fundamento × prova (ou plano executivo, se credor)", "Valor incontroverso × valor controvertido", "Recomendação estratégica com cenários financeiros"],
        criterio: "Uma boa resposta transforma os autos em números conferidos e numa recomendação clara: quanto é devido de verdade e qual o melhor movimento agora.",
      },
    ],
  },
];

/* ================= LOGICA ================= */

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

export function buildPrompt(m: Modulo, c: Cenario, v: ValoresForm): string {
  const NI = "[NÃO INFORMADO]";
  const sel = (x: string) => (x && !x.startsWith("—") ? x : "");

  let p = `# PAPEL\n${c.papel}\n\n`;

  p += `# CONTEXTO DO CASO\n`;
  for (const f of m.fields) {
    const raw = f.t === "select" ? sel(v.campos[f.id] ?? "") : (v.campos[f.id] ?? "");
    if (f.req || raw) {
      p += `- ${f.l}: ${f.req ? raw || NI : raw}\n`;
    }
  }
  p += `\n`;

  p += `# BASE NORMATIVA DE REFERÊNCIA\n${stripTags(c.base)}\nConfirme e aprofunde cada fundamento diretamente nas normas carregadas no notebook.\n\n`;

  p += `# FONTES\n${FONTES_PADRAO}\n`;
  if (v.web) {
    p += `Além das fontes locais, verifique se há mudanças recentes (legislação, resoluções ou jurisprudência nova) pesquisando na web — e SINALIZE claramente o que veio da web e o que veio das fontes do notebook.\n`;
  }
  p += `\n`;

  p += `# TAREFA\n`;
  const focos = v.descobrir.map((i) => c.descobrir[i]).filter(Boolean);
  if (focos.length) p += `Objetivos prioritários desta análise: ${focos.join("; ")}.\n\n`;
  p += `Passo a passo:\n`;
  c.tarefa.forEach((t, i) => {
    p += `${i + 1}. ${t}\n`;
  });
  p += `\n`;

  p += `# ESTRUTURA DA RESPOSTA\n`;
  if (sel(v.fmt)) p += `Formato: ${v.fmt}.\n`;
  p += `A resposta deve conter, no mínimo:\n`;
  c.minimos.forEach((x) => {
    p += `- ${x}\n`;
  });
  p += `\n`;

  p += `# RESTRIÇÕES\n`;
  RESTRICOES_PADRAO.forEach((r) => {
    p += `- ${r}\n`;
  });
  if (v.obs) p += `- Instruções adicionais do advogado: ${v.obs}\n`;
  p += `\n`;

  p += `# CRITÉRIO DE QUALIDADE\n${c.criterio}`;
  return p;
}

export function scorePrompt(m: Modulo, v: ValoresForm): number {
  let got = 0;
  let tot = 0;
  for (const f of m.fields) {
    const w = f.req ? 3 : f.t === "ta" ? 2 : 1;
    tot += w;
    const raw =
      f.t === "select"
        ? v.campos[f.id] && !v.campos[f.id].startsWith("—")
          ? v.campos[f.id]
          : ""
        : (v.campos[f.id] ?? "");
    if (raw) {
      got += f.t === "ta" && raw.length > 80 ? w : f.t === "ta" ? w * 0.6 : w;
    }
  }
  tot += 2;
  if (v.descobrir.length) got += Math.min(2, v.descobrir.length * 0.7);
  tot += 1;
  if (v.fmt && !v.fmt.startsWith("—")) got += 1;
  return Math.round((100 * got) / tot);
}

export function nivelForca(s: number): { nome: string; cor: string } {
  if (s < 35) return { nome: "FRACO", cor: "text-red-600" };
  if (s < 60) return { nome: "MÉDIO", cor: "text-amber-600" };
  if (s < 85) return { nome: "FORTE", cor: "text-emerald-600" };
  return { nome: "EXCELENTE", cor: "text-brand-navy" };
}
