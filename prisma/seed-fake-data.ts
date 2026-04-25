/**
 * Seed de dados ficticios para teste e apresentacao.
 *
 * Usa os MUNICIPIOS e GESTORES REAIS ja cadastrados no banco
 * (rode prisma/seed-real-data.ts antes).
 *
 * Cria ~100 processos com numeros claramente ficticios (prefixo DEMO/TC-DEMO),
 * andamentos, prazos, pautas e monitoramento.
 *
 * Uso: tsx prisma/seed-fake-data.ts
 */
import {
  CamaraTce,
  Grau,
  PrismaClient,
  Risco,
  Role,
  TipoInteressado,
  TipoProcesso,
  TipoProcessoTce,
  Tribunal,
} from "@prisma/client";

import { calcularDataVencimento } from "../lib/dias-uteis";

const prisma = new PrismaClient();

// ============ PRNG deterministico ============
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260425);
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
function shuffled<T>(arr: readonly T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randDateBetween(start: Date, end: Date): Date {
  const t = start.getTime() + rand() * (end.getTime() - start.getTime());
  return new Date(t);
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}
function repeat<T>(item: T, n: number): T[] {
  return Array.from({ length: n }, () =>
    typeof item === "object" && item !== null
      ? ({ ...(item as object) } as T)
      : item,
  );
}

// ============ Constantes ============
const RELATORES_TCE: Record<CamaraTce, string[]> = {
  PRIMEIRA: ["Ranilson Ramos", "Rodrigo Novaes", "Dirceu Rodolfo"],
  SEGUNDA: ["Eduardo Porto", "Marcos Loreto", "Valdecir Pascoal"],
  PLENO: [
    "Carlos Neves",
    "Ranilson Ramos",
    "Rodrigo Novaes",
    "Dirceu Rodolfo",
    "Eduardo Porto",
    "Marcos Loreto",
    "Valdecir Pascoal",
  ],
};
const CONSELHEIROS_SUBSTITUTOS = [
  "Marcos Flavio",
  "Alda Magalhaes",
  "Luiz Arcoverde",
  "Carlos Pimentel",
  "Ricardo Rios",
];

const FASES_TCE_PADRAO = [
  "defesa_previa",
  "defesa_apresentada",
  "acordao_1",
  "embargos_1",
  "acordao_embargos_1",
  "recurso_ordinario",
  "acordao_ro",
  "embargos_ro",
];
const FASES_TCE_CAUTELAR = [
  "manifestacao_previa",
  "manifestacao_apresentada",
  "decisao_monocratica",
  "referendo_pleno",
  "decisao_referendo",
  "agravo_regimental",
];

const FASES_PRIMEIRO = [
  "aguardando_contestacao",
  "contestacao_apresentada",
  "prazo_provas",
  "audiencia_agendada",
  "ag_alegacoes_finais",
  "alegacoes_finais_apres",
  "sentenca",
];
const FASES_SEGUNDO = [
  "recurso_interposto",
  "contrarrazoes_apres",
  "pauta_julgamento",
  "julgamento_2grau",
  "julgamento_ed_2grau",
];
const FASES_SUPERIOR = [
  "admissibilidade_sup",
  "julgamento_superior",
  "concluso_julgamento",
];

const OBJETOS_TCE: Record<TipoProcessoTce, string[]> = {
  PRESTACAO_CONTAS_GOVERNO: [
    "Prestacao de contas anual de governo com apontamentos sobre execucao orcamentaria do exercicio.",
    "Contas anuais com indicios de descumprimento de limites de pessoal previstos na LRF.",
    "Prestacao de contas com observacoes sobre transferencias voluntarias e convenios.",
  ],
  PRESTACAO_CONTAS_GESTAO: [
    "Prestacao de contas de gestao com apontamentos formais sanaveis em folha de pagamento.",
    "Contas de gestao com itens sobre execucao de convenios e prestacao de servicos terceirizados.",
    "Prestacao de contas referente ao exercicio com inconsistencias em obras publicas.",
  ],
  AUDITORIA_ESPECIAL: [
    "Auditoria especial em contrato de prestacao de servicos de limpeza urbana.",
    "Auditoria especial em obras de pavimentacao asfaltica com apontamentos tecnicos.",
    "Auditoria especial sobre contratacao emergencial de medicamentos.",
  ],
  RGF: [
    "Relatorio de gestao fiscal com indicadores acima dos limites prudenciais de pessoal.",
    "RGF do segundo quadrimestre com apontamentos sobre divida consolidada.",
    "RGF apresentando deficiencia formal em demonstrativos.",
  ],
  AUTO_INFRACAO: [
    "Auto de infracao por descumprimento de prazo de envio de informacoes ao Sagres.",
    "Auto de infracao por irregularidades em portal da transparencia municipal.",
    "Auto de infracao decorrente de auditoria de inspecao.",
  ],
  MEDIDA_CAUTELAR: [
    "Medida cautelar visando suspender procedimento licitatorio com indicios de direcionamento.",
    "Medida cautelar de suspensao de contrato com sobrepreco aparente.",
    "Cautelar para sustar pagamentos em obra com indicios de superfaturamento.",
  ],
  TOMADA_CONTAS_ESPECIAL: [
    "Tomada de contas especial por dano ao erario em obra inacabada.",
    "TCE para apurar dano em convenio nao executado integralmente.",
    "Tomada de contas especial referente a desvio em transferencia voluntaria.",
  ],
  DESTAQUE: [
    "Destaque em sessao plenaria sobre processo originalmente em camara.",
    "Destaque para reanalise de tese em prestacao de contas.",
  ],
  DENUNCIA: [
    "Denuncia anonima sobre supostas irregularidades em contratacao direta.",
    "Denuncia formal de servidor sobre atrasos em pagamentos a fornecedores.",
    "Denuncia sobre eventuais desvios em obra de infraestrutura.",
  ],
  TERMO_AJUSTE_GESTAO: [
    "Termo de ajuste de gestao firmado para regularizacao de pendencias administrativas.",
  ],
  PEDIDO_RESCISAO: [
    "Pedido de rescisao de acordao por suposta falsidade documental.",
    "Pedido de rescisao por novo fato relevante apos transito em julgado.",
  ],
  CONSULTA: [
    "Consulta em tese sobre interpretacao de norma de licitacao.",
    "Consulta sobre aplicacao da LC 14.230/21 a casos pendentes.",
  ],
};

const OBJETOS_JUD: Record<TipoProcesso, string[]> = {
  IMPROBIDADE: [
    "Acao de improbidade administrativa por suposto desvio em licitacao de obras publicas.",
    "Improbidade culposa anterior a LC 14.230/21 com discussao sobre prescricao.",
    "Acao por dispensa indevida de licitacao em contratacao emergencial.",
  ],
  ACP: [
    "Acao civil publica por danos ambientais decorrentes de empreendimento sem licenca.",
    "ACP visando obrigar municipio a executar obra de saneamento basico.",
    "Acao civil publica em defesa de patrimonio publico municipal.",
  ],
  CRIMINAL: [
    "Apelacao criminal por crimes contra a administracao publica.",
    "Defesa em acao penal por suposto crime de fraude em licitacao.",
    "Recurso em sentido estrito em processo criminal por peculato.",
  ],
  ACAO_POPULAR: [
    "Acao popular questionando contrato administrativo com sobrepreco.",
    "Acao popular para anular ato de nomeacao de servidor sem concurso.",
  ],
  MANDADO_SEGURANCA: [
    "Mandado de seguranca contra ato de autoridade que negou homologacao.",
    "MS contra ato coator do Tribunal de Contas em fiscalizacao.",
  ],
  MANDADO_SEGURANCA_COLETIVO: [
    "Mandado de seguranca coletivo impetrado por entidade representativa.",
  ],
  HABEAS_CORPUS: [
    "Habeas corpus impetrado em favor de gestor publico denunciado.",
    "Habeas corpus para trancamento de acao penal por atipicidade.",
  ],
  HABEAS_DATA: [
    "Habeas data para acesso a informacoes em banco de dados publico.",
  ],
  ACAO_RESCISORIA: [
    "Acao rescisoria de acordao por violacao a literal disposicao de lei.",
    "Acao rescisoria com base em prova nova posterior ao transito.",
  ],
  EXECUCAO_FISCAL: [
    "Execucao fiscal de credito tributario municipal.",
    "Acao de execucao fiscal com discussao sobre prescricao intercorrente.",
  ],
  EXECUCAO_TITULO_EXTRAJUDICIAL: [
    "Execucao de titulo extrajudicial com discussao sobre certeza e liquidez.",
  ],
  CUMPRIMENTO_SENTENCA: [
    "Cumprimento de sentenca com pedido de bloqueio via Sisbajud.",
  ],
  ACAO_ORDINARIA: [
    "Acao ordinaria visando declaracao de inexigibilidade de credito.",
  ],
  ACAO_DECLARATORIA: [
    "Acao declaratoria de nulidade de auto de infracao.",
  ],
  ACAO_ANULATORIA: [
    "Acao anulatoria de debito fiscal com pedido de tutela de urgencia.",
  ],
  EMBARGOS_EXECUCAO: [
    "Embargos a execucao com discussao sobre excesso de execucao.",
  ],
  EMBARGOS_TERCEIRO: [
    "Embargos de terceiro contra constricao de bem em execucao alheia.",
  ],
  RECLAMACAO: [
    "Reclamacao para preservacao da competencia de tribunal superior.",
  ],
  CONFLITO_COMPETENCIA: [
    "Conflito de competencia entre orgaos para processamento da causa.",
  ],
  MEDIDA_CAUTELAR: [
    "Medida cautelar para sustar atos administrativos ate decisao de merito.",
  ],
  TUTELA_CAUTELAR_ANTECEDENTE: [
    "Tutela cautelar antecedente para preservacao de direito alegadamente em risco.",
  ],
  PROCEDIMENTO_COMUM: [
    "Acao em procedimento comum sobre responsabilidade civil de agente publico.",
    "Procedimento comum com discussao sobre acumulacao de cargos.",
  ],
  JUIZADO_ESPECIAL: [
    "Acao em juizado especial cuja parte e o municipio.",
  ],
  OUTRO: [
    "Acao com objeto especifico nao classificavel nas categorias padrao.",
  ],
};

const TIPOS_PRAZO_JUD = [
  "Elaborar Memorial",
  "Despacho com Relator",
  "Contestacao",
  "Replica",
  "Alegacoes Finais",
  "Embargos de Declaracao",
  "Apelacao",
  "Contrarrazoes",
  "Recurso Especial",
  "Agravo",
  "Audiencia",
];
const TIPOS_PRAZO_TCE_NORMAL = [
  "Defesa Previa",
  "Embargos de Declaracao",
  "Recurso Ordinario",
  "Contrarrazoes",
  "Memorial",
  "Esclarecimentos",
];

// Andamento templates por fase
const ANDAMENTO_JUD_TEMPLATES: Record<string, string[]> = {
  aguardando_contestacao: [
    "Citacao expedida ao reu/reqdo. Aguardando manifestacao no prazo legal.",
    "Juntada de mandado de citacao cumprido positivamente.",
  ],
  contestacao_apresentada: [
    "Contestacao protocolada com preliminares e merito.",
    "Apresentada defesa com requerimento de producao de provas.",
  ],
  prazo_provas: [
    "Especificacao de provas pelas partes.",
    "Decisao de saneamento e organizacao do processo.",
  ],
  audiencia_agendada: [
    "Audiencia de instrucao e julgamento designada.",
  ],
  ag_alegacoes_finais: [
    "Encerrada a instrucao. Aberto prazo para alegacoes finais.",
  ],
  alegacoes_finais_apres: [
    "Alegacoes finais protocoladas pelo escritorio.",
  ],
  sentenca: [
    "Sentenca de procedencia parcial publicada. Iniciado prazo recursal.",
    "Sentenca prolatada com condenacao das partes contrarias.",
  ],
  recurso_interposto: [
    "Apelacao interposta pelo escritorio dentro do prazo legal.",
    "Recurso interposto pela parte adversa.",
  ],
  contrarrazoes_apres: [
    "Contrarrazoes protocoladas em prazo regular.",
  ],
  pauta_julgamento: [
    "Processo incluido em pauta de julgamento.",
  ],
  julgamento_2grau: [
    "Julgamento em segundo grau realizado conforme pauta.",
  ],
  julgamento_ed_2grau: [
    "Embargos de declaracao apreciados em segundo grau.",
  ],
  admissibilidade_sup: [
    "Recurso submetido a juizo de admissibilidade no tribunal superior.",
  ],
  julgamento_superior: [
    "Julgamento realizado por colegiado superior.",
  ],
  concluso_julgamento: [
    "Autos conclusos para julgamento.",
  ],
};
const ANDAMENTO_TCE_TEMPLATES: Record<string, string[]> = {
  defesa_previa: [
    "Aberto prazo para apresentacao de defesa previa.",
    "Citacao do interessado para defesa previa.",
  ],
  defesa_apresentada: [
    "Defesa previa protocolada com documentos comprobatorios.",
  ],
  acordao_1: [
    "Acordao publicado pela Camara julgadora.",
    "Decisao colegiada com determinacoes ao gestor.",
  ],
  embargos_1: [
    "Embargos de declaracao opostos pelo interessado.",
  ],
  acordao_embargos_1: [
    "Acordao em sede de embargos de declaracao.",
  ],
  recurso_ordinario: [
    "Recurso ordinario interposto perante o Pleno.",
  ],
  acordao_ro: [
    "Acordao em sede de recurso ordinario publicado.",
  ],
  embargos_ro: [
    "Embargos de declaracao apos recurso ordinario.",
  ],
  manifestacao_previa: [
    "Aberto prazo para manifestacao previa em medida cautelar.",
  ],
  manifestacao_apresentada: [
    "Manifestacao protocolada pelo escritorio.",
  ],
  decisao_monocratica: [
    "Decisao monocratica do relator deferindo/indeferindo a cautelar.",
  ],
  referendo_pleno: [
    "Cautelar levada ao referendo do Pleno.",
  ],
  decisao_referendo: [
    "Pleno referendou a decisao monocratica.",
  ],
  agravo_regimental: [
    "Agravo regimental interposto pelo interessado.",
  ],
};

// ============ Distribuicoes ============
type PlanoTce = { tipo: TipoProcessoTce; qtd: number };
const PLANO_TCE: PlanoTce[] = [
  { tipo: "PRESTACAO_CONTAS_GOVERNO", qtd: 10 },
  { tipo: "PRESTACAO_CONTAS_GESTAO", qtd: 10 },
  { tipo: "AUDITORIA_ESPECIAL", qtd: 10 },
  { tipo: "AUTO_INFRACAO", qtd: 5 },
  { tipo: "MEDIDA_CAUTELAR", qtd: 5 },
  { tipo: "RGF", qtd: 5 },
  { tipo: "TOMADA_CONTAS_ESPECIAL", qtd: 5 },
  { tipo: "DENUNCIA", qtd: 3 },
  { tipo: "DESTAQUE", qtd: 3 },
  { tipo: "CONSULTA", qtd: 2 },
  { tipo: "PEDIDO_RESCISAO", qtd: 2 },
];

type PlanoJud = {
  tipo: TipoProcesso;
  tribunal: Tribunal;
  grau: Grau;
};
function gerarPlanoJudicial(): PlanoJud[] {
  const plano: PlanoJud[] = [];
  // Tipos: 12 IMPROBIDADE, 8 ACP, 5 CRIMINAL, 3 MS, 3 ACAO_POPULAR, 3 EXEC_FISCAL, 2 ACAO_RESCISORIA, 2 HC, 2 PROC_COMUM
  const tipos: TipoProcesso[] = [
    ...repeat<TipoProcesso>("IMPROBIDADE", 12),
    ...repeat<TipoProcesso>("ACP", 8),
    ...repeat<TipoProcesso>("CRIMINAL", 5),
    ...repeat<TipoProcesso>("MANDADO_SEGURANCA", 3),
    ...repeat<TipoProcesso>("ACAO_POPULAR", 3),
    ...repeat<TipoProcesso>("EXECUCAO_FISCAL", 3),
    ...repeat<TipoProcesso>("ACAO_RESCISORIA", 2),
    ...repeat<TipoProcesso>("HABEAS_CORPUS", 2),
    ...repeat<TipoProcesso>("PROCEDIMENTO_COMUM", 2),
  ];

  // Tribunal+grau combos: STJ-SUPERIOR x5, TJPE-PRIMEIRO x10, TJPE-SEGUNDO x10,
  // TRF5-PRIMEIRO x5, TRF5-SEGUNDO x5, TRF1-PRIMEIRO x5
  const slots: { tribunal: Tribunal; grau: Grau }[] = [
    ...repeat({ tribunal: Tribunal.STJ, grau: Grau.SUPERIOR }, 5),
    ...repeat({ tribunal: Tribunal.TJPE, grau: Grau.PRIMEIRO }, 10),
    ...repeat({ tribunal: Tribunal.TJPE, grau: Grau.SEGUNDO }, 10),
    ...repeat({ tribunal: Tribunal.TRF5, grau: Grau.PRIMEIRO }, 5),
    ...repeat({ tribunal: Tribunal.TRF5, grau: Grau.SEGUNDO }, 5),
    ...repeat({ tribunal: Tribunal.TRF1, grau: Grau.PRIMEIRO }, 5),
  ];

  // Tentar casar tipos com slots de forma coerente: HC nao no STJ vez crime;
  // Acao Popular tipicamente TJPE; Exec Fiscal tipicamente TJPE 1o grau; etc.
  // Para simplicidade, embaralhamos e vinculamos.
  const tiposEmb = shuffled(tipos);
  const slotsEmb = shuffled(slots);
  for (let i = 0; i < 40; i++) {
    plano.push({
      tipo: tiposEmb[i],
      tribunal: slotsEmb[i].tribunal,
      grau: slotsEmb[i].grau,
    });
  }
  return plano;
}

function gerarRiscos(): Risco[] {
  return shuffled([
    ...repeat<Risco>("ALTO", 15),
    ...repeat<Risco>("MEDIO", 15),
    ...repeat<Risco>("BAIXO", 10),
  ]);
}

// ============ Helpers de geracao ============
function juizoDe(tribunal: Tribunal, grau: Grau, tipo: TipoProcesso): string {
  const camara = randInt(1, 4);
  const vara = randInt(1, 10);
  if (grau === Grau.SUPERIOR) {
    return `${tribunal} - ${randInt(1, 6)}a Turma`;
  }
  if (grau === Grau.SEGUNDO) {
    if (tribunal === Tribunal.TJPE) {
      const tema = tipo === "CRIMINAL" || tipo === "HABEAS_CORPUS"
        ? "Criminal"
        : "de Direito Publico";
      return `TJPE - ${camara}a Camara ${tema}`;
    }
    return `${tribunal} - ${camara}a Turma`;
  }
  if (tribunal === Tribunal.TJPE) {
    if (tipo === "CRIMINAL" || tipo === "HABEAS_CORPUS")
      return `${vara}a Vara Criminal de Recife`;
    return `${vara}a Vara da Fazenda Publica de Recife`;
  }
  if (tribunal === Tribunal.TRF5) return `${vara}a Vara Federal de Pernambuco`;
  if (tribunal === Tribunal.TRF1) return `${vara}a Vara Federal do DF`;
  return `${tribunal} - ${randInt(1, 6)}a Turma`;
}

function escolherFase(grau: Grau): string {
  if (grau === Grau.PRIMEIRO) return pick(FASES_PRIMEIRO);
  if (grau === Grau.SEGUNDO) return pick(FASES_SEGUNDO);
  return pick(FASES_SUPERIOR);
}

function escolherFaseTce(tipo: TipoProcessoTce): string {
  if (tipo === "MEDIDA_CAUTELAR") return pick(FASES_TCE_CAUTELAR);
  return pick(FASES_TCE_PADRAO);
}

let seqJud = 0;
function gerarNumeroJudFake(tribunal: Tribunal): string {
  seqJud++;
  const seq = String(seqJud).padStart(4, "0");
  if (tribunal === Tribunal.TJPE) return `DEMO-${seq}.2025.8.17.0001`;
  if (tribunal === Tribunal.TRF5) return `DEMO-${seq}.2025.4.05.8300`;
  if (tribunal === Tribunal.TRF1) return `DEMO-${seq}.2025.4.01.3300`;
  return `DEMO-${seq}.2025.3.00.0001`;
}
let seqTce = 0;
function gerarNumeroTceFake(): string {
  seqTce++;
  const seq = String(seqTce).padStart(4, "0");
  return `TC-DEMO-${seq}/2025`;
}

// ============ Main ============
async function main() {
  const escritorio = await prisma.escritorio.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!escritorio) throw new Error("Escritorio nao encontrado.");

  const advogados = await prisma.user.findMany({
    where: { escritorioId: escritorio.id, role: Role.ADVOGADO },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
  if (advogados.length < 1)
    throw new Error("Nenhum advogado encontrado. Rode seed-advogados.");

  const adminUser = await prisma.user.findFirst({
    where: { escritorioId: escritorio.id, role: Role.ADMIN },
    select: { id: true, nome: true },
  });
  const autorAndamento = adminUser ?? advogados[0];

  const gestoresPf = await prisma.gestor.findMany({
    where: {
      escritorioId: escritorio.id,
      tipoInteressado: TipoInteressado.PESSOA_FISICA,
    },
    select: { id: true, nome: true, municipio: true, cargo: true },
  });
  if (gestoresPf.length === 0)
    throw new Error(
      "Nenhum gestor PF. Rode prisma/seed-real-data.ts primeiro.",
    );

  const gestoresPj = await prisma.gestor.findMany({
    where: {
      escritorioId: escritorio.id,
      tipoInteressado: TipoInteressado.PESSOA_JURIDICA,
    },
    select: { id: true, nome: true },
  });

  const todosInteressados = [...gestoresPf, ...gestoresPj.map((g) => ({
    ...g,
    municipio: "",
    cargo: "Empresa",
  }))];

  const municipios = await prisma.municipio.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, nome: true },
  });
  if (municipios.length === 0)
    throw new Error("Nenhum municipio. Rode prisma/seed-real-data.ts antes.");

  const municipioPorNome = new Map(municipios.map((m) => [m.nome, m.id]));

  console.log(`Escritorio: ${escritorio.nome}`);
  console.log(
    `  Advogados: ${advogados.length} | Gestores PF: ${gestoresPf.length} | Gestores PJ: ${gestoresPj.length} | Municipios: ${municipios.length}\n`,
  );

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // ================== 60 PROCESSOS TCE ==================
  console.log("=== Criando 60 processos TCE ===");
  const processosTceCriados: {
    id: string;
    numero: string;
    tipo: TipoProcessoTce;
    faseAtual: string;
    municipioNome: string | null;
  }[] = [];

  const camaras: CamaraTce[] = ["PRIMEIRA", "SEGUNDA", "PLENO"];
  const flagsTce = {
    notaTecnicaRestantes: 15,
    parecerMpcoRestantes: 12,
    memorialProntoRestantes: 8,
    despachadoRestantes: 5,
  };

  for (const plano of PLANO_TCE) {
    for (let k = 0; k < plano.qtd; k++) {
      const tipo = plano.tipo;
      const camara = tipo === "MEDIDA_CAUTELAR" ? "PLENO" : pick(camaras);
      const relator = pick(RELATORES_TCE[camara]);
      const fase = escolherFaseTce(tipo);
      const dataAutuacao = randDateBetween(
        new Date("2022-01-01"),
        new Date("2026-04-15"),
      );
      const dataIntimacao = addDays(dataAutuacao, randInt(5, 30));
      const exercicio = String(randInt(2019, 2025));
      const valorAutuado = Math.round(randInt(5, 2000) * 1000); // 5k a 2M
      const objeto = pick(OBJETOS_TCE[tipo] ?? ["Processo TCE."]);
      const numero = gerarNumeroTceFake();

      // Municipio: para tipos com gestao publica vincular um municipio real
      const municipio = pick(municipios);
      const conselheiroSubst = rand() < 0.2 ? pick(CONSELHEIROS_SUBSTITUTOS) : null;

      const notaTecnica = flagsTce.notaTecnicaRestantes > 0 && rand() < 0.4;
      if (notaTecnica) flagsTce.notaTecnicaRestantes--;
      const parecerMpco = flagsTce.parecerMpcoRestantes > 0 && rand() < 0.35;
      if (parecerMpco) flagsTce.parecerMpcoRestantes--;
      const memorialPronto = flagsTce.memorialProntoRestantes > 0 && rand() < 0.2;
      if (memorialPronto) flagsTce.memorialProntoRestantes--;
      const despachado =
        memorialPronto && flagsTce.despachadoRestantes > 0 && rand() < 0.5;
      if (despachado) flagsTce.despachadoRestantes--;

      const p = await prisma.processoTce.create({
        data: {
          numero,
          tipo,
          municipioId: municipio.id,
          relator,
          camara,
          faseAtual: fase,
          conselheiroSubstituto: conselheiroSubst,
          notaTecnica,
          parecerMpco,
          memorialPronto,
          despachadoComRelator: despachado,
          dataDespacho: despachado ? addDays(hoje, -randInt(5, 60)) : null,
          retornoDespacho: despachado
            ? "Relator manifestou-se favoravelmente as alegacoes apresentadas."
            : null,
          exercicio,
          valorAutuado,
          objeto,
          dataAutuacao,
          dataIntimacao,
          escritorioId: escritorio.id,
        },
        select: {
          id: true,
          numero: true,
          tipo: true,
          faseAtual: true,
        },
      });

      // Vincular 1-4 interessados (preferindo gestores do mesmo municipio)
      const candidatosMesmoMunicipio = gestoresPf.filter(
        (g) => g.municipio === municipio.nome,
      );
      const qtdInt = randInt(1, 4);
      const escolhidos: typeof todosInteressados = [];
      // primeiro tenta os do municipio
      for (const g of pickN(candidatosMesmoMunicipio, qtdInt)) {
        escolhidos.push(g);
      }
      // completa com qualquer outro se faltar
      while (escolhidos.length < qtdInt) {
        const cand = pick(todosInteressados);
        if (!escolhidos.find((e) => e.id === cand.id)) escolhidos.push(cand);
      }
      for (const g of escolhidos) {
        const cargoInt =
          gestoresPj.find((pj) => pj.id === g.id)
            ? "Empresa contratada"
            : g.cargo || pick(["Prefeito", "Ex-Prefeito", "Secretario"]);
        try {
          await prisma.interessadoProcessoTce.create({
            data: { processoId: p.id, gestorId: g.id, cargo: cargoInt },
          });
        } catch {
          // duplicata: ignora
        }
      }

      processosTceCriados.push({
        ...p,
        municipioNome: municipio.nome,
      });
    }
  }
  console.log(`  ${processosTceCriados.length} processos TCE criados.\n`);

  // ================== 40 PROCESSOS JUDICIAIS ==================
  console.log("=== Criando 40 processos judiciais ===");
  const planoJud = gerarPlanoJudicial();
  const riscos = gerarRiscos();

  const processosJudCriados: {
    id: string;
    numero: string;
    tipo: TipoProcesso;
    tribunal: Tribunal;
    grau: Grau;
    fase: string;
  }[] = [];

  for (let i = 0; i < 40; i++) {
    const p = planoJud[i];
    const risco = riscos[i];
    const fase = escolherFase(p.grau);
    const dataDistribuicao = randDateBetween(
      new Date("2020-01-01"),
      new Date("2026-04-15"),
    );
    const valor = randInt(50, 5000) * 1000;
    const gestor = pick(gestoresPf);
    const advogado = pick(advogados);
    const numero = gerarNumeroJudFake(p.tribunal);
    const objeto = pick(OBJETOS_JUD[p.tipo] ?? ["Acao judicial."]);

    const memorialPronto = rand() < 0.18;
    const despachado = memorialPronto && rand() < 0.4;

    const proc = await prisma.processo.create({
      data: {
        numero,
        tipo: p.tipo,
        tribunal: p.tribunal,
        juizo: juizoDe(p.tribunal, p.grau, p.tipo),
        grau: p.grau,
        fase,
        risco,
        valor,
        dataDistribuicao,
        objeto,
        memorialPronto,
        despachadoComRelator: despachado,
        dataDespacho: despachado ? addDays(hoje, -randInt(5, 45)) : null,
        retornoDespacho: despachado
          ? "Relator demonstrou abertura para os argumentos do escritorio."
          : null,
        gestorId: gestor.id,
        advogadoId: advogado.id,
        escritorioId: escritorio.id,
      },
      select: {
        id: true,
        numero: true,
        tipo: true,
        tribunal: true,
        grau: true,
        fase: true,
      },
    });
    processosJudCriados.push(proc);
  }
  console.log(`  ${processosJudCriados.length} processos judiciais criados.\n`);

  // ================== ANDAMENTOS ==================
  console.log("=== Criando andamentos (3-5 por processo) ===");
  let totalAndJud = 0;
  let totalAndTce = 0;

  for (const proc of processosJudCriados) {
    const qtd = randInt(3, 5);
    const baseDate = addDays(hoje, -randInt(60, 800));
    for (let i = 0; i < qtd; i++) {
      const dataAnd = addDays(baseDate, i * randInt(15, 60));
      const templates = ANDAMENTO_JUD_TEMPLATES[proc.fase] ?? [
        "Movimentacao processual registrada nos autos.",
      ];
      await prisma.andamento.create({
        data: {
          processoId: proc.id,
          data: dataAnd,
          grau: proc.grau,
          fase: proc.fase,
          texto: pick(templates),
          autorId: autorAndamento.id,
        },
      });
      totalAndJud++;
    }
  }

  for (const proc of processosTceCriados) {
    const qtd = randInt(3, 5);
    const baseDate = addDays(hoje, -randInt(30, 700));
    for (let i = 0; i < qtd; i++) {
      const dataAnd = addDays(baseDate, i * randInt(10, 50));
      const templates = ANDAMENTO_TCE_TEMPLATES[proc.faseAtual] ?? [
        "Movimentacao processual TCE registrada.",
      ];
      await prisma.andamentoTce.create({
        data: {
          processoId: proc.id,
          data: dataAnd,
          fase: proc.faseAtual,
          descricao: pick(templates),
          autorId: autorAndamento.id,
        },
      });
      totalAndTce++;
    }
  }
  console.log(`  Andamentos jud: ${totalAndJud} | TCE: ${totalAndTce}\n`);

  // ================== PRAZOS ==================
  console.log("=== Criando 50 prazos judiciais e 50 prazos TCE ===");

  // ---- 50 prazos judiciais ----
  // 5 cumpridos. Distribuir offsets em [-10, 90].
  const offsetsJud = shuffled([
    -10, -7, -5, -3, -1,
    0, 0, 0,
    1, 2, 3, 3, 4, 5,
    7, 7, 8, 9, 10,
    12, 14, 15, 15, 18, 20,
    25, 28, 30, 30, 33, 35,
    40, 45, 50, 55, 60, 60, 65,
    70, 75, 80, 85, 90, 90,
    -2, 4, 22, 38, 88, 6,
  ]);

  let totalPrazoJud = 0;
  for (let i = 0; i < 50; i++) {
    const offset = offsetsJud[i] ?? randInt(-5, 90);
    const proc = pick(processosJudCriados);
    const tipoPrazo = pick(TIPOS_PRAZO_JUD);
    const advogado = pick(advogados);
    const data = addDays(hoje, offset);
    const cumprido = i < 5;
    await prisma.prazo.create({
      data: {
        processoId: proc.id,
        tipo: tipoPrazo,
        data,
        cumprido,
        geradoAuto: false,
        advogadoRespId: advogado.id,
      },
    });
    totalPrazoJud++;
  }

  // ---- 50 prazos TCE ----
  const cautelaresEDestaques = processosTceCriados.filter(
    (p) => p.tipo === "MEDIDA_CAUTELAR" || p.tipo === "DESTAQUE",
  );
  const naoImprorr = processosTceCriados.filter(
    (p) => p.tipo !== "MEDIDA_CAUTELAR" && p.tipo !== "DESTAQUE",
  );

  // Distribuicao desejada:
  //  - 10 improrrogaveis (cautelares/destaques)
  //  - 5 prorrogacao pedida
  //  - 5 cumpridos (= 10 cumpridos no total - 5 jud)
  //  - 30 normais
  // Offsets variados em [-10, 90]
  const offsetsTce = shuffled([
    -10, -7, -3, -1, 0, 0,
    1, 2, 3, 5, 7, 7, 10, 12, 15, 15, 18, 20,
    22, 25, 28, 30, 30, 33, 35, 40, 45, 50,
    55, 60, 60, 65, 70, 75, 80, 85, 88, 90, 90,
    4, 8, 11, 14, 17, 24, 33, 44, -2, 0,
    6, 13,
  ]);

  let totalPrazoTce = 0;
  for (let i = 0; i < 50; i++) {
    const ehImprorr = i < 10;
    const ehProrrog = i >= 10 && i < 15;
    const ehCumprido = i >= 15 && i < 20;

    let processo;
    if (ehImprorr && cautelaresEDestaques.length > 0) {
      processo = pick(cautelaresEDestaques);
    } else {
      processo = pick(naoImprorr.length > 0 ? naoImprorr : processosTceCriados);
    }

    const tipoPrazo = ehImprorr
      ? processo.tipo === "MEDIDA_CAUTELAR"
        ? "Manifestacao Previa"
        : "Defesa Previa"
      : pick(TIPOS_PRAZO_TCE_NORMAL);
    const diasUteis = ehImprorr ? (processo.tipo === "MEDIDA_CAUTELAR" ? 5 : 2) : pick([10, 15, 20, 30, 30, 30, 45]);

    const offsetDias = offsetsTce[i] ?? randInt(0, 90);
    const dataIntimacao = addDays(hoje, offsetDias - diasUteis);
    const dataVencimento = calcularDataVencimento(dataIntimacao, diasUteis);

    const prorrogavel = !ehImprorr;
    const prorrogacaoPedida = ehProrrog;
    const dataProrrogacao = prorrogacaoPedida
      ? calcularDataVencimento(dataVencimento, diasUteis)
      : null;
    const advogado = pick(advogados);

    await prisma.prazoTce.create({
      data: {
        processoId: processo.id,
        tipo: tipoPrazo,
        dataIntimacao,
        dataVencimento,
        diasUteis,
        prorrogavel,
        prorrogacaoPedida,
        dataProrrogacao,
        cumprido: ehCumprido,
        advogadoRespId: advogado.id,
      },
    });
    totalPrazoTce++;
  }
  console.log(`  Prazos jud: ${totalPrazoJud} | Prazos TCE: ${totalPrazoTce}\n`);

  // ================== PAUTAS ==================
  console.log("=== Criando pautas (TCE + TJPE + TRF5) ===");

  function quartaDaSemana(offsetSemanas: number): Date {
    const d = new Date(hoje);
    const dia = d.getDay(); // 0 dom, 3 quarta
    const ate3 = (3 - dia + 7) % 7;
    d.setDate(d.getDate() + ate3 + offsetSemanas * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // 3 weeks TCE × 3 camaras = 9 sessoes
  let totalSessoesTce = 0;
  let totalItensTce = 0;
  const camarasTce: CamaraTce[] = ["PRIMEIRA", "SEGUNDA", "PLENO"];
  for (let semana = 0; semana < 3; semana++) {
    const dataBase = quartaDaSemana(semana);
    for (let c = 0; c < camarasTce.length; c++) {
      const camara = camarasTce[c];
      // Cada camara em dia ligeiramente diferente (terca, quarta, quinta)
      const dataSessao = addDays(dataBase, c - 1);
      const sessao = await prisma.sessaoPauta.create({
        data: {
          data: dataSessao,
          camara,
          escritorioId: escritorio.id,
        },
        select: { id: true },
      });
      totalSessoesTce++;
      // 3-5 itens por sessao
      const candidatos = processosTceCriados.filter(
        (p) =>
          (camara === "PLENO" && p.tipo === "MEDIDA_CAUTELAR") ||
          (camara !== "PLENO" && p.tipo !== "MEDIDA_CAUTELAR"),
      );
      const escolhidos = pickN(
        candidatos.length > 0 ? candidatos : processosTceCriados,
        randInt(3, 5),
      );
      for (let ord = 0; ord < escolhidos.length; ord++) {
        const proc = escolhidos[ord];
        const relator = pick(RELATORES_TCE[camara]);
        const advResp = pick(advogados).nome;
        await prisma.itemPauta.create({
          data: {
            sessaoId: sessao.id,
            numeroProcesso: proc.numero,
            tituloProcesso: proc.tipo.replace(/_/g, " "),
            municipio: proc.municipioNome ?? "",
            relator,
            advogadoResp: advResp,
            ordem: ord + 1,
            processoTceId: proc.id,
            prognostico: pick(["favoravel", "desfavoravel", "indefinido", null]),
          },
        });
        totalItensTce++;
      }
    }
  }
  console.log(`  TCE: ${totalSessoesTce} sessoes / ${totalItensTce} itens.`);

  // 3 weeks TJPE × 3 orgaos rotativos
  const orgaosTjpe = [
    "1a Camara de Direito Publico",
    "2a Camara de Direito Publico",
    "3a Camara de Direito Publico",
    "1a Camara Criminal",
    "2a Camara Criminal",
  ];
  let totalSessoesTjpe = 0;
  let totalItensTjpe = 0;
  for (let semana = 0; semana < 3; semana++) {
    const dataBase = quartaDaSemana(semana);
    const orgaosSemana = pickN(orgaosTjpe, 3);
    for (let o = 0; o < orgaosSemana.length; o++) {
      const orgao = orgaosSemana[o];
      const dataSessao = addDays(dataBase, o - 1);
      const sessao = await prisma.sessaoJudicial.create({
        data: {
          data: dataSessao,
          tribunal: "TJPE",
          orgaoJulgador: orgao,
          tipoSessao: pick(["presencial", "virtual"]),
          escritorioId: escritorio.id,
        },
        select: { id: true },
      });
      totalSessoesTjpe++;
      const ehCriminal = orgao.includes("Criminal");
      const candidatos = processosJudCriados.filter(
        (p) =>
          p.tribunal === "TJPE" &&
          p.grau === "SEGUNDO" &&
          (ehCriminal
            ? p.tipo === "CRIMINAL" || p.tipo === "HABEAS_CORPUS"
            : p.tipo !== "CRIMINAL" && p.tipo !== "HABEAS_CORPUS"),
      );
      const escolhidos = pickN(
        candidatos.length > 0
          ? candidatos
          : processosJudCriados.filter((p) => p.tribunal === "TJPE"),
        randInt(3, 5),
      );
      for (let ord = 0; ord < escolhidos.length; ord++) {
        const proc = escolhidos[ord];
        await prisma.itemPautaJudicial.create({
          data: {
            sessaoId: sessao.id,
            numeroProcesso: proc.numero,
            tituloProcesso: proc.tipo.replace(/_/g, " "),
            tipoRecurso: pick([
              "Apelacao",
              "Embargos de Declaracao",
              "Agravo de Instrumento",
              "Agravo Interno",
            ]),
            relator: "Desembargador Relator",
            advogadoResp: pick(advogados).nome,
            ordem: ord + 1,
            processoId: proc.id,
            prognostico: pick(["favoravel", "desfavoravel", "indefinido", null]),
            sessaoVirtual: rand() < 0.3,
          },
        });
        totalItensTjpe++;
      }
    }
  }
  console.log(`  TJPE: ${totalSessoesTjpe} sessoes / ${totalItensTjpe} itens.`);

  // 2 weeks TRF5 × 3 turmas
  const turmasTrf5 = [
    "1a Turma",
    "2a Turma",
    "3a Turma",
    "4a Turma",
    "5a Turma",
  ];
  let totalSessoesTrf5 = 0;
  let totalItensTrf5 = 0;
  for (let semana = 0; semana < 2; semana++) {
    const dataBase = quartaDaSemana(semana);
    const turmasSemana = pickN(turmasTrf5, 3);
    for (let t = 0; t < turmasSemana.length; t++) {
      const turma = turmasSemana[t];
      const dataSessao = addDays(dataBase, t - 1);
      const sessao = await prisma.sessaoJudicial.create({
        data: {
          data: dataSessao,
          tribunal: "TRF5",
          orgaoJulgador: turma,
          tipoSessao: pick(["presencial", "virtual"]),
          escritorioId: escritorio.id,
        },
        select: { id: true },
      });
      totalSessoesTrf5++;
      const candidatos = processosJudCriados.filter(
        (p) => p.tribunal === "TRF5" && p.grau === "SEGUNDO",
      );
      const escolhidos = pickN(
        candidatos.length > 0
          ? candidatos
          : processosJudCriados.filter((p) => p.tribunal === "TRF5"),
        randInt(2, 4),
      );
      for (let ord = 0; ord < escolhidos.length; ord++) {
        const proc = escolhidos[ord];
        await prisma.itemPautaJudicial.create({
          data: {
            sessaoId: sessao.id,
            numeroProcesso: proc.numero,
            tituloProcesso: proc.tipo.replace(/_/g, " "),
            tipoRecurso: pick(["Apelacao", "Agravo de Instrumento", "Embargos de Declaracao"]),
            relator: "Desembargador Federal Relator",
            advogadoResp: pick(advogados).nome,
            ordem: ord + 1,
            processoId: proc.id,
            sessaoVirtual: rand() < 0.4,
          },
        });
        totalItensTrf5++;
      }
    }
  }
  console.log(`  TRF5: ${totalSessoesTrf5} sessoes / ${totalItensTrf5} itens.\n`);

  // ================== MONITORAMENTO ==================
  console.log("=== Criando 10 monitoramentos ativos ===");
  const candidatosMonit = pickN(processosJudCriados, 10);
  let totalMonit = 0;
  for (const p of candidatosMonit) {
    await prisma.monitoramentoConfig.create({
      data: {
        processoId: p.id,
        monitoramentoAtivo: true,
        ultimaVerificacao: addDays(hoje, -randInt(0, 5)),
      },
    });
    totalMonit++;
  }
  console.log(`  ${totalMonit} monitoramentos.\n`);

  // ================== RESUMO ==================
  const counts = {
    processo: await prisma.processo.count(),
    processoTce: await prisma.processoTce.count(),
    andamento: await prisma.andamento.count(),
    andamentoTce: await prisma.andamentoTce.count(),
    prazo: await prisma.prazo.count(),
    prazoTce: await prisma.prazoTce.count(),
    interessado: await prisma.interessadoProcessoTce.count(),
    sessaoPauta: await prisma.sessaoPauta.count(),
    itemPauta: await prisma.itemPauta.count(),
    sessaoJudicial: await prisma.sessaoJudicial.count(),
    itemPautaJudicial: await prisma.itemPautaJudicial.count(),
    monitoramento: await prisma.monitoramentoConfig.count(),
  };

  console.log("==================== RESUMO FINAL ====================");
  console.log(`  Processos judiciais (Processo)       : ${counts.processo}`);
  console.log(`  Processos TCE (ProcessoTce)          : ${counts.processoTce}`);
  console.log(`  Andamentos judiciais (Andamento)     : ${counts.andamento}`);
  console.log(`  Andamentos TCE (AndamentoTce)        : ${counts.andamentoTce}`);
  console.log(`  Prazos judiciais (Prazo)             : ${counts.prazo}`);
  console.log(`  Prazos TCE (PrazoTce)                : ${counts.prazoTce}`);
  console.log(`  Interessados TCE                     : ${counts.interessado}`);
  console.log(`  Sessoes pauta TCE (SessaoPauta)      : ${counts.sessaoPauta}`);
  console.log(`  Itens pauta TCE (ItemPauta)          : ${counts.itemPauta}`);
  console.log(`  Sessoes pauta jud (SessaoJudicial)   : ${counts.sessaoJudicial}`);
  console.log(`  Itens pauta jud (ItemPautaJudicial)  : ${counts.itemPautaJudicial}`);
  console.log(`  Monitoramento ativo                  : ${counts.monitoramento}`);
  console.log(`  TOTAL processos                       : ${counts.processo + counts.processoTce}`);
}

main()
  .catch((e) => {
    console.error("ERRO:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
