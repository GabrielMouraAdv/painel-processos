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

// ============ PRNG deterministico para reprodutibilidade ============
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

// ============ Constantes ============
const TRIBUNAIS_JUD: Tribunal[] = [
  Tribunal.TJPE,
  Tribunal.TRF5,
  Tribunal.TRF1,
  Tribunal.STJ,
];
const RISCOS: Risco[] = [Risco.ALTO, Risco.MEDIO, Risco.BAIXO];
const TIPOS_JUD: TipoProcesso[] = [
  TipoProcesso.IMPROBIDADE,
  TipoProcesso.ACP,
  TipoProcesso.CRIMINAL,
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

const OBJETOS_JUD = [
  "Acao de improbidade administrativa por suposto desvio em licitacao de obras publicas.",
  "Acao civil publica por danos ambientais decorrentes de empreendimento sem licenca.",
  "Mandado de seguranca contra ato de autoridade que negou homologacao de procedimento.",
  "Apelacao criminal por crimes contra a administracao publica.",
  "Recurso especial sobre interpretacao da Lei de Improbidade pos LC 14.230/21.",
  "Embargos de declaracao opostos contra decisao monocratica.",
  "Acao civil publica por improbidade culposa anterior a LC 14.230/21.",
  "Defesa em acao penal por suposto crime de fraude em licitacao.",
];

const TIPOS_TCE: TipoProcessoTce[] = [
  TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO,
  TipoProcessoTce.PRESTACAO_CONTAS_GESTAO,
  TipoProcessoTce.AUDITORIA_ESPECIAL,
  TipoProcessoTce.RGF,
  TipoProcessoTce.AUTO_INFRACAO,
  TipoProcessoTce.MEDIDA_CAUTELAR,
];
const CAMARAS: CamaraTce[] = [
  CamaraTce.PRIMEIRA,
  CamaraTce.SEGUNDA,
  CamaraTce.PLENO,
];

const FASES_TCE_PADRAO = [
  "defesa_previa",
  "defesa_apresentada",
  "acordao_1",
  "embargos_1",
  "acordao_embargos_1",
  "recurso_ordinario",
  "acordao_ro",
];
const FASES_TCE_CAUTELAR = [
  "manifestacao_previa",
  "manifestacao_apresentada",
  "decisao_monocratica",
  "referendo_pleno",
  "decisao_referendo",
  "agravo_regimental",
];
const RELATORES_CAMARAS: Record<CamaraTce, string[]> = {
  PRIMEIRA: ["Ranilson Ramos", "Rodrigo Novaes", "Dirceu Rodolfo"],
  SEGUNDA: ["Eduardo Porto", "Marcos Loreto", "Valdecir Pascoal"],
  PLENO: ["Carlos Neves", "Marcos Loreto", "Ranilson Ramos", "Eduardo Porto"],
};

const OBJETOS_TCE = [
  "Prestacao de contas anual com apontamentos sobre execucao orcamentaria.",
  "Auditoria especial em contrato de prestacao de servicos de limpeza urbana.",
  "Relatorio de gestao fiscal com indicadores acima dos limites prudenciais.",
  "Auto de infracao por descumprimento de prazos de envio de informacoes.",
  "Medida cautelar visando suspender procedimento licitatorio.",
  "Tomada de contas especial por dano ao erario em obra inacabada.",
  "Prestacao de contas de gestao com apontamentos formais sanaveis.",
];

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
const TIPOS_PRAZO_TCE = [
  "Defesa Previa",
  "Manifestacao Previa",
  "Embargos de Declaracao",
  "Recurso Ordinario",
  "Contrarrazoes",
  "Memorial",
  "Esclarecimentos",
];

// ============ Helpers de geracao ============
function gerarNumeroJudicial(tribunal: Tribunal, idx: number): string {
  const seq = String(20000 + idx).padStart(7, "0");
  const dv = String(idx % 100).padStart(2, "0");
  const ano = "2025";
  // formato CNJ NNNNNNN-DD.AAAA.J.TR.OOOO
  if (tribunal === Tribunal.TJPE) {
    const oj = String(2000 + (idx % 90)).padStart(4, "0");
    return `${seq}-${dv}.${ano}.8.17.${oj}`;
  }
  if (tribunal === Tribunal.TRF5) {
    const oj = String(8300 + (idx % 90)).padStart(4, "0");
    return `${seq}-${dv}.${ano}.4.05.${oj}`;
  }
  if (tribunal === Tribunal.TRF1) {
    const oj = String(3300 + (idx % 90)).padStart(4, "0");
    return `${seq}-${dv}.${ano}.4.01.${oj}`;
  }
  // STJ — usar nrec STJ
  return `${seq}-${dv}.${ano}.3.00.0001`;
}

function gerarNumeroTce(idx: number): string {
  const seq = String(20000 + idx).padStart(6, "0");
  return `TC-${seq}/2025`;
}

function juizoDe(tribunal: Tribunal, grau: Grau, tipo: TipoProcesso): string {
  const camara = randInt(1, 8);
  const vara = randInt(1, 10);
  if (grau === Grau.SUPERIOR) {
    return `${tribunal} - ${randInt(1, 6)}a Turma`;
  }
  if (grau === Grau.SEGUNDO) {
    if (tribunal === Tribunal.TJPE) {
      const tema = tipo === TipoProcesso.CRIMINAL ? "Criminal" : "de Direito Publico";
      return `TJPE - ${camara}a Camara ${tema}`;
    }
    return `${tribunal} - ${camara}a Turma`;
  }
  if (tribunal === Tribunal.TJPE) {
    if (tipo === TipoProcesso.CRIMINAL) return `${vara}a Vara Criminal de Recife`;
    return `${vara}a Vara da Fazenda Publica de Recife`;
  }
  if (tribunal === Tribunal.TRF5)
    return `${vara}a Vara Federal de Pernambuco`;
  if (tribunal === Tribunal.TRF1) return `${vara}a Vara Federal do DF`;
  return `${tribunal} - ${randInt(1, 6)}a Turma`;
}

function escolherFase(grau: Grau): string {
  if (grau === Grau.PRIMEIRO) return pick(FASES_PRIMEIRO);
  if (grau === Grau.SEGUNDO) return pick(FASES_SEGUNDO);
  return pick(FASES_SUPERIOR);
}

// ============ Main ============
async function main() {
  const escritorio = await prisma.escritorio.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!escritorio) {
    throw new Error("Nenhum escritorio encontrado. Rode o seed principal.");
  }

  const advogados = await prisma.user.findMany({
    where: { escritorioId: escritorio.id, role: Role.ADVOGADO },
    select: { id: true, nome: true },
  });
  if (advogados.length === 0) {
    throw new Error("Nenhum advogado encontrado. Rode seed-advogados primeiro.");
  }

  const gestoresPf = await prisma.gestor.findMany({
    where: {
      escritorioId: escritorio.id,
      tipoInteressado: TipoInteressado.PESSOA_FISICA,
    },
    select: { id: true, nome: true, municipio: true },
  });
  if (gestoresPf.length === 0) {
    throw new Error("Nenhum gestor PF encontrado. Rode seed principal.");
  }

  const gestoresPj = await prisma.gestor.findMany({
    where: {
      escritorioId: escritorio.id,
      tipoInteressado: TipoInteressado.PESSOA_JURIDICA,
    },
    select: { id: true, nome: true },
  });

  const todosGestores = await prisma.gestor.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, nome: true, tipoInteressado: true },
  });

  const municipios = await prisma.municipio.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, nome: true, uf: true },
  });
  if (municipios.length === 0) {
    throw new Error("Nenhum municipio cadastrado. Rode seed principal.");
  }

  // ========== Antes ==========
  const totalProcessosAntes = await prisma.processo.count({
    where: { escritorioId: escritorio.id },
  });
  const totalProcessosTceAntes = await prisma.processoTce.count({
    where: { escritorioId: escritorio.id },
  });
  const totalPrazosAntes = await prisma.prazo.count({
    where: { processo: { escritorioId: escritorio.id } },
  });
  const totalPrazosTceAntes = await prisma.prazoTce.count({
    where: { processo: { escritorioId: escritorio.id } },
  });

  // ============ 30 Processos Judiciais ============
  console.log("\n=== Criando 30 processos judiciais ===");
  const processosJudCriados: { id: string; numero: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const tribunal = pick(TRIBUNAIS_JUD);
    const tipo = pick(TIPOS_JUD);
    let grau: Grau;
    if (tribunal === Tribunal.STJ) grau = Grau.SUPERIOR;
    else grau = pick([Grau.PRIMEIRO, Grau.PRIMEIRO, Grau.SEGUNDO]); // peso maior em 1o
    const fase = escolherFase(grau);
    const risco = pick(RISCOS);
    const valor = randInt(50, 5000) * 1000; // 50k a 5M
    const gestor = pick(gestoresPf);
    const advogado = pick(advogados);
    const dataDistribuicao = randDateBetween(
      new Date("2020-01-01"),
      new Date("2026-04-20"),
    );
    const numero = gerarNumeroJudicial(tribunal, i);
    const objeto = pick(OBJETOS_JUD);

    const p = await prisma.processo.create({
      data: {
        numero,
        tipo,
        tribunal,
        juizo: juizoDe(tribunal, grau, tipo),
        grau,
        fase,
        risco,
        valor,
        dataDistribuicao,
        objeto,
        gestorId: gestor.id,
        advogadoId: advogado.id,
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processosJudCriados.push(p);
    console.log(`  [${i + 1}/30] ${numero} (${tribunal}, ${tipo}, ${risco})`);
  }

  // ============ 20 Processos TCE ============
  console.log("\n=== Criando 20 processos TCE ===");
  const processosTceCriados: { id: string; numero: string }[] = [];
  for (let i = 0; i < 20; i++) {
    const tipo = pick(TIPOS_TCE);
    const camara =
      tipo === TipoProcessoTce.MEDIDA_CAUTELAR
        ? CamaraTce.PLENO
        : pick(CAMARAS);
    const fasesPossiveis =
      tipo === TipoProcessoTce.MEDIDA_CAUTELAR
        ? FASES_TCE_CAUTELAR
        : FASES_TCE_PADRAO;
    const faseAtual = pick(fasesPossiveis);
    const relator = pick(RELATORES_CAMARAS[camara]);
    const municipio = pick(municipios);
    const numero = gerarNumeroTce(i);
    const dataAutuacao = randDateBetween(
      new Date("2022-01-01"),
      new Date("2026-04-15"),
    );
    const dataIntimacao = addDays(dataAutuacao, randInt(5, 30));
    const exercicio = String(randInt(2019, 2025));
    const valorAutuado = randInt(0, 1) === 1 ? randInt(100, 8000) * 1000 : null;
    const objeto = pick(OBJETOS_TCE);

    const p = await prisma.processoTce.create({
      data: {
        numero,
        tipo,
        municipioId: municipio.id,
        relator,
        camara,
        faseAtual,
        notaTecnica: rand() < 0.45,
        parecerMpco: rand() < 0.35,
        despachadoComRelator: rand() < 0.4,
        memorialPronto: rand() < 0.25,
        exercicio,
        valorAutuado,
        objeto,
        dataAutuacao,
        dataIntimacao,
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processosTceCriados.push(p);

    // Vincular 1-3 interessados (PF + PJ se houver)
    const interessadosPool = todosGestores;
    const qtdInteressados = randInt(1, Math.min(3, interessadosPool.length));
    const escolhidos = pickN(interessadosPool, qtdInteressados);
    for (const g of escolhidos) {
      const cargoInt =
        g.tipoInteressado === TipoInteressado.PESSOA_JURIDICA
          ? "Empresa contratada"
          : pick(["Prefeito", "Ex-Prefeito", "Secretario", "Ordenador de Despesas"]);
      try {
        await prisma.interessadoProcessoTce.create({
          data: {
            processoId: p.id,
            gestorId: g.id,
            cargo: cargoInt,
          },
        });
      } catch {
        // duplicata: ignora
      }
    }
    console.log(
      `  [${i + 1}/20] ${numero} (${tipo}, ${camara}, ${faseAtual})`,
    );
  }
  void gestoresPj; // referenciado para nao quebrar import futuro

  // ============ 50 Prazos Judiciais ============
  console.log("\n=== Criando 50 prazos judiciais ===");
  // Pool de processos (existentes + novos)
  const todosProcessosJud = await prisma.processo.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, numero: true },
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Distribuicao de offsets em dias (corridos)
  const offsetsJud = [
    -10, -7, -5, -3, -1, // vencidos
    0, 0, // hoje
    1, 2, 3, 3, 4,
    7, 7, 8, 10,
    15, 15, 18, 20,
    30, 30, 32, 35,
    45, 50, 55, 60, 60, 65,
    75, 80, 85, 90, 90,
    // preenche para 50 com mais variacao
    2, 5, 9, 12, 14, 22, 28, 40, 70, 88,
    -2, -8, 4, 25, 38,
  ];
  while (offsetsJud.length < 50) offsetsJud.push(randInt(-5, 90));

  let prazosJudCriados = 0;
  for (let i = 0; i < 50; i++) {
    const offset = offsetsJud[i];
    const proc = pick(todosProcessosJud);
    const tipoPrazo = pick(TIPOS_PRAZO_JUD);
    const advogado = pick(advogados);
    const data = addDays(hoje, offset);
    const cumprido = i < 5; // primeiros 5 cumpridos
    try {
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
      prazosJudCriados++;
    } catch (err) {
      console.warn(
        `  prazo jud falhou (${proc.numero}, ${tipoPrazo}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log(`  ${prazosJudCriados}/50 prazos judiciais criados`);

  // ============ 50 Prazos TCE ============
  console.log("\n=== Criando 50 prazos TCE ===");
  const todosProcessosTce = await prisma.processoTce.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, numero: true, tipo: true },
  });

  // 10 cautelares improrrogaveis (5 dias uteis), 5 com prorrogacaoPedida, 5 cumpridos, restante variado
  const offsetsBaseTceUteis = [
    1, 2, 3, 5, 7, 10, 12, 15, 18, 20, 22, 25, 28, 30, 35, 40, 45, 50, 55, 60,
    65, 70, 75, 80, 85, 88, 90,
    1, 4, 6, 8, 9, 11, 14, 17, 24, 33, 44,
    -3, -1, 0, 2, 5, 13, 20,
  ];
  while (offsetsBaseTceUteis.length < 50)
    offsetsBaseTceUteis.push(randInt(-2, 90));

  let prazosTceCriados = 0;
  for (let i = 0; i < 50; i++) {
    const ehCautelar = i < 10; // primeiras 10: cautelar 5 dias uteis improrrogavel
    const ehProrrogacao = i >= 10 && i < 15; // 5 prorrogacao pedida
    const cumprido = i >= 15 && i < 20; // 5 cumpridos

    let processo = pick(todosProcessosTce);
    if (ehCautelar) {
      // procurar uma cautelar; se nao existir, usa qualquer
      const cautelares = todosProcessosTce.filter(
        (p) => p.tipo === TipoProcessoTce.MEDIDA_CAUTELAR,
      );
      if (cautelares.length > 0) processo = pick(cautelares);
    }

    const tipoPrazo = ehCautelar
      ? "Manifestacao Previa"
      : pick(TIPOS_PRAZO_TCE);
    const diasUteis = ehCautelar ? 5 : pick([10, 15, 20, 30, 30, 30, 45]);

    const offsetDias = offsetsBaseTceUteis[i] ?? randInt(0, 90);
    const dataIntimacao = addDays(hoje, offsetDias - diasUteis);
    const dataVencimento = calcularDataVencimento(dataIntimacao, diasUteis);

    const prorrogavel = !ehCautelar;
    const prorrogacaoPedida = ehProrrogacao;
    const dataProrrogacao = prorrogacaoPedida
      ? calcularDataVencimento(dataVencimento, diasUteis)
      : null;
    const advogado = pick(advogados);

    try {
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
          cumprido,
          advogadoRespId: advogado.id,
        },
      });
      prazosTceCriados++;
    } catch (err) {
      console.warn(
        `  prazo tce falhou (${processo.numero}, ${tipoPrazo}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log(`  ${prazosTceCriados}/50 prazos TCE criados`);

  // ========== Resumo final ==========
  const totalProcessosDepois = await prisma.processo.count({
    where: { escritorioId: escritorio.id },
  });
  const totalProcessosTceDepois = await prisma.processoTce.count({
    where: { escritorioId: escritorio.id },
  });
  const totalPrazosDepois = await prisma.prazo.count({
    where: { processo: { escritorioId: escritorio.id } },
  });
  const totalPrazosTceDepois = await prisma.prazoTce.count({
    where: { processo: { escritorioId: escritorio.id } },
  });

  console.log("\n========== RESUMO ==========");
  console.log(
    `Processos judiciais: ${totalProcessosAntes} -> ${totalProcessosDepois} (+${totalProcessosDepois - totalProcessosAntes})`,
  );
  console.log(
    `Processos TCE     : ${totalProcessosTceAntes} -> ${totalProcessosTceDepois} (+${totalProcessosTceDepois - totalProcessosTceAntes})`,
  );
  console.log(
    `Prazos judiciais  : ${totalPrazosAntes} -> ${totalPrazosDepois} (+${totalPrazosDepois - totalPrazosAntes})`,
  );
  console.log(
    `Prazos TCE        : ${totalPrazosTceAntes} -> ${totalPrazosTceDepois} (+${totalPrazosTceDepois - totalPrazosTceAntes})`,
  );
  console.log(
    `\nTOTAL processos: ${totalProcessosDepois + totalProcessosTceDepois}`,
  );
  console.log(`TOTAL prazos   : ${totalPrazosDepois + totalPrazosTceDepois}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
