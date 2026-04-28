// Cadastro dos processos reais do escritorio Henrique Arruda Advocacia
// (banca henrique). Roda manualmente:
//   npx tsx prisma/seed-real-henrique.ts

import {
  PrismaClient,
  CamaraTce,
  TipoProcessoTce,
  TipoRecursoTce,
} from "@prisma/client";
import { TCE_CAMARAS } from "../lib/tce-config";

const prisma = new PrismaClient();

const SLUG_HA = "henrique";

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

function camaraDoRelator(relatorRaw: string | null): CamaraTce {
  if (!relatorRaw) return CamaraTce.PLENO;
  const nomeBase = RELATOR_ALIAS[relatorRaw] ?? relatorRaw;
  if (PRIMEIRA_TITULARES.has(nomeBase)) return CamaraTce.PRIMEIRA;
  if (SEGUNDA_TITULARES.has(nomeBase)) return CamaraTce.SEGUNDA;
  if (nomeBase === PLENO_PRESIDENTE) return CamaraTce.PLENO;
  return CamaraTce.PLENO;
}

type Estagio =
  | "EM_INSTRUCAO"
  | "EM_JULGAMENTO"
  | "JULGADO"
  | "JULGADO_RECORRIDO";

function faseDoEstagio(e: Estagio): { fase: string; julgado: boolean } {
  switch (e) {
    case "EM_INSTRUCAO":
      return { fase: "em_instrucao", julgado: false };
    case "EM_JULGAMENTO":
      return { fase: "em_julgamento", julgado: false };
    case "JULGADO":
      return { fase: "julgado", julgado: true };
    case "JULGADO_RECORRIDO":
      return { fase: "julgado_recorrido", julgado: true };
  }
}

// ETAPA 1: entidades especiais novas
const ENTIDADES_NOVAS = [
  {
    nome: "URB-Recife",
    uf: "PE",
    observacoes: "Autarquia de Urbanizacao do Recife (URB-Recife)",
  },
  {
    nome: "Autarquia Transito Ipojuca",
    uf: "PE",
    observacoes:
      "Autarquia Municipal de Transito e Transportes de Ipojuca",
  },
  {
    nome: "Secretaria Educacao PE",
    uf: "PE",
    observacoes: "Secretaria de Educacao e Esportes de Pernambuco - secretaria estadual",
  },
];

// ETAPA 2: compartilhados (acrescentar henrique)
// 25101086-7 nao existe -> nao incluido aqui (logado como aviso)
const COMPARTILHADOS_PROC = [
  "24101177-2",
  "23100768-1",
  "23101016-3",
  "20100346-6",
  "20100534-7",
  "19100418-2",
  "19100283-5", // ja existe com [filipe-campos]
];
const COMPARTILHADOS_SUB = ["24101177-2RO001", "24101177-2ED002"];

// ETAPA 3: subprocessos novos compartilhados
// (nascem com [filipe-campos, porto-rodrigues, henrique] = pai + henrique)
type SubProcCompartilhado = {
  processoPaiNumero: string;
  sufixo: string;
  tipoRecurso: TipoRecursoTce;
  numeroSequencial: number;
  exercicio: string;
  relator: string;
  estagio: Estagio;
};

const SUB_COMPARTILHADOS_NOVOS: SubProcCompartilhado[] = [
  { processoPaiNumero: "24101177-2", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2025", relator: "Ranilson Ramos", estagio: "JULGADO" },
  { processoPaiNumero: "23100768-1", sufixo: "ED003", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 3, exercicio: "2025", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { processoPaiNumero: "23100768-1", sufixo: "ED004", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 4, exercicio: "2025", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { processoPaiNumero: "20100346-6", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2024", relator: "Marcos Loreto", estagio: "JULGADO" },
  { processoPaiNumero: "20100346-6", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2024", relator: "Marcos Loreto", estagio: "JULGADO" },
];

// ETAPA 4: processos principais novos (6) + ETAPA 5 (255633) = 7 totais
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
  { numero: "PI2600192", municipio: "URB-Recife", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2026", relator: "Dirceu Rodolfo Junior", estagio: "EM_INSTRUCAO", objetoExtra: "Fiscalizacao - Acompanhamento" },
  { numero: "25101290-6", municipio: "URB-Recife", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2025", relator: "Dirceu Rodolfo Junior", estagio: "EM_JULGAMENTO" },
  { numero: "25100035-7", municipio: "Dormentes", tipo: TipoProcessoTce.AUTO_INFRACAO, exercicio: "2025", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "24101240-5", municipio: "Cachoeirinha", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2019-2024", relator: "Eduardo Porto", estagio: "JULGADO_RECORRIDO" },
  { numero: "24100794-0", municipio: "Autarquia Transito Ipojuca", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023-2024", relator: "Rodrigo Novaes", estagio: "EM_JULGAMENTO" },
  { numero: "23101019-9", municipio: "Altinho", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023", relator: "Marcos Flavio Tenorio de Almeida", estagio: "JULGADO_RECORRIDO" },
  // ETAPA 5: 255633 sem relator, mapeado para AUDITORIA_ESPECIAL com nota
  { numero: "255633", municipio: "Sao Caetano", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2025", relator: null, estagio: "JULGADO", objetoExtra: "Processo em admissibilidade - numero provisorio 255633. Tipo originalmente solicitado: Embargos de Declaracao (nao consta no enum TipoProcessoTce; mapeado para AUDITORIA_ESPECIAL)." },
];

// ETAPA 6: placeholders (4 — nao inclui 19100283-5 que ja existe)
type PlaceholderInput = {
  numero: string;
  municipio: string;
  exercicio: string;
  relator: string;
};
const PLACEHOLDERS: PlaceholderInput[] = [
  { numero: "24100650-8", municipio: "Secretaria Educacao PE", exercicio: "2024", relator: "Dirceu Rodolfo Junior" },
  { numero: "23100799-1", municipio: "Altinho", exercicio: "2023", relator: "Adriano Cisneiros" },
  { numero: "22100639-4", municipio: "Sao Caetano", exercicio: "2022", relator: "Rodrigo Novaes" },
  { numero: "22100079-3", municipio: "Manari", exercicio: "2022", relator: "Carlos Pimentel" },
];

// ETAPA 7: subprocessos henrique puros (15)
type SubprocessoInput = {
  processoPaiNumero: string;
  sufixo: string;
  tipoRecurso: TipoRecursoTce;
  numeroSequencial: number;
  exercicio: string;
  relator: string;
  estagio: Estagio;
};

const SUBPROCESSOS: SubprocessoInput[] = [
  { processoPaiNumero: "24101240-5", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2025", relator: "Dirceu Rodolfo Junior", estagio: "JULGADO" },
  { processoPaiNumero: "24100650-8", sufixo: "AR002", tipoRecurso: TipoRecursoTce.AGRAVO_REGIMENTAL, numeroSequencial: 2, exercicio: "2024", relator: "Dirceu Rodolfo Junior", estagio: "JULGADO" },
  { processoPaiNumero: "23101019-9", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { processoPaiNumero: "23101019-9", sufixo: "RO002", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 2, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { processoPaiNumero: "23101019-9", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2025", relator: "Marcos Flavio Tenorio de Almeida", estagio: "JULGADO" },
  { processoPaiNumero: "23101019-9", sufixo: "ED002", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 2, exercicio: "2025", relator: "Marcos Flavio Tenorio de Almeida", estagio: "JULGADO" },
  { processoPaiNumero: "23100799-1", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2024", relator: "Adriano Cisneiros", estagio: "JULGADO" },
  { processoPaiNumero: "22100639-4", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2025", relator: "Rodrigo Novaes", estagio: "JULGADO" },
  { processoPaiNumero: "22100639-4", sufixo: "ED002", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 2, exercicio: "2025", relator: "Rodrigo Novaes", estagio: "JULGADO" },
  { processoPaiNumero: "22100639-4", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2025", relator: "Rodrigo Novaes", estagio: "JULGADO" },
  { processoPaiNumero: "22100079-3", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2025", relator: "Ruy Ricardo Harten", estagio: "JULGADO" },
  { processoPaiNumero: "22100079-3", sufixo: "ED003", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 3, exercicio: "2025", relator: "Carlos Pimentel", estagio: "JULGADO" },
  { processoPaiNumero: "22100079-3", sufixo: "RO002", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 2, exercicio: "2025", relator: "Carlos Pimentel", estagio: "JULGADO" },
  { processoPaiNumero: "19100283-5", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2025", relator: "Marcos Nobrega", estagio: "EM_JULGAMENTO" },
  { processoPaiNumero: "19100283-5", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2021", relator: "Marcos Nobrega", estagio: "JULGADO_RECORRIDO" },
];

async function main() {
  const erros: string[] = [];
  const avisos: string[] = [];

  const escritorio = await prisma.escritorio.findFirst({
    select: { id: true, nome: true },
  });
  if (!escritorio) throw new Error("Nenhum escritorio cadastrado.");
  console.log(`Escritorio alvo: ${escritorio.nome} (${escritorio.id})`);

  // Aviso sobre 25101086-7
  avisos.push(
    "25101086-7 nao existe no banco — pulado (estava com vinculacao condicional 'se ja existir')",
  );

  // ETAPA 1
  console.log("\n--- ETAPA 1: criando entidades especiais ---");
  let entidadesCriadas = 0;
  for (const m of ENTIDADES_NOVAS) {
    const ja = await prisma.municipio.findFirst({
      where: { nome: m.nome, escritorioId: escritorio.id },
      select: { id: true },
    });
    if (ja) {
      console.log(`  [skip] ${m.nome} ja existe`);
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
    console.log(`  [criado] ${m.nome}`);
  }

  // ETAPA 2: compartilhados
  console.log("\n--- ETAPA 2: atualizando compartilhados (acrescentar henrique) ---");
  let compartilhadosOk = 0;
  for (const numero of COMPARTILHADOS_PROC) {
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
    const novo = Array.from(new Set([...found.bancasSlug, SLUG_HA]));
    await prisma.processoTce.update({
      where: { id: found.id },
      data: { bancasSlug: novo },
    });
    compartilhadosOk++;
    console.log(`  [ok] ${numero} -> [${novo.join(", ")}]`);
  }
  let compartilhadosSubOk = 0;
  for (const numero of COMPARTILHADOS_SUB) {
    const found = await prisma.subprocessoTce.findFirst({
      where: { numero },
      select: { id: true, bancasSlug: true },
    });
    if (!found) {
      const erro = `Compartilhado sub ${numero}: SubprocessoTce nao encontrado`;
      console.error(`  [ERRO] ${erro}`);
      erros.push(erro);
      continue;
    }
    const novo = Array.from(new Set([...found.bancasSlug, SLUG_HA]));
    await prisma.subprocessoTce.update({
      where: { id: found.id },
      data: { bancasSlug: novo },
    });
    compartilhadosSubOk++;
    console.log(`  [ok] sub ${numero} -> [${novo.join(", ")}]`);
  }

  // mapa municipio
  const municipiosDoEscritorio = await prisma.municipio.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, nome: true },
  });
  const municipioByNome = new Map(
    municipiosDoEscritorio.map((m) => [m.nome, m.id]),
  );

  // ETAPA 3: subprocessos compartilhados novos
  console.log("\n--- ETAPA 3: subprocessos compartilhados novos ---");
  let subCompartilhadosNovos = 0;
  for (const s of SUB_COMPARTILHADOS_NOVOS) {
    const pai = await prisma.processoTce.findFirst({
      where: { numero: s.processoPaiNumero },
      select: { id: true, bancasSlug: true },
    });
    if (!pai) {
      const erro = `Subprocesso ${s.processoPaiNumero}${s.sufixo}: pai nao encontrado`;
      console.error(`  [ERRO] ${erro}`);
      erros.push(erro);
      continue;
    }
    // bancasSlug = pai.bancasSlug + henrique
    const bancasSlug = Array.from(new Set([...pai.bancasSlug, SLUG_HA]));
    const numero = `${s.processoPaiNumero}${s.sufixo}`;
    const fase = faseDoEstagio(s.estagio).fase;
    const ano = parseInt(s.exercicio, 10);
    const dataInterposicao = isNaN(ano)
      ? new Date()
      : new Date(Date.UTC(ano, 0, 1));
    await prisma.subprocessoTce.create({
      data: {
        processoPaiId: pai.id,
        numero,
        tipoRecurso: s.tipoRecurso,
        numeroSequencial: s.numeroSequencial,
        dataInterposicao,
        fase,
        relator: s.relator,
        bancasSlug,
      },
    });
    subCompartilhadosNovos++;
    console.log(
      `  [ok] ${numero} | ${s.tipoRecurso} | ${s.relator} | ${fase} | [${bancasSlug.join(", ")}]`,
    );
  }

  // ETAPA 4 + 5: processos novos (incluindo 255633)
  console.log("\n--- ETAPA 4+5: cadastrando processos principais novos (inclui 255633) ---");
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
    const camara = camaraDoRelator(p.relator);
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
        bancasSlug: [SLUG_HA],
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processoIdByNumero.set(created.numero, created.id);
    principaisCadastrados++;
    console.log(
      `  [ok] ${p.numero.padEnd(15)} | ${p.municipio} | ${camara} | ${fase}`,
    );
  }

  // ETAPA 6: placeholders
  console.log("\n--- ETAPA 6: cadastrando placeholders ---");
  const placeholdersLista: string[] = [];
  let placeholdersCriados = 0;
  for (const ph of PLACEHOLDERS) {
    const municipioId = municipioByNome.get(ph.municipio);
    if (!municipioId) {
      const erro = `Placeholder ${ph.numero}: municipio '${ph.municipio}' nao encontrado`;
      console.error(`  [ERRO] ${erro}`);
      erros.push(erro);
      continue;
    }
    const camara = camaraDoRelator(ph.relator);
    const { fase, julgado } = faseDoEstagio("JULGADO_RECORRIDO");
    const objeto = `[Placeholder] Processo cadastrado para abrigar recursos (subprocessos) ja interpostos. Os dados originais (autuacao, intimacao, valor, fase real, tipo correto) devem ser preenchidos posteriormente.`;
    const created = await prisma.processoTce.create({
      data: {
        numero: ph.numero,
        tipo: TipoProcessoTce.AUDITORIA_ESPECIAL,
        municipioId,
        relator: ph.relator,
        camara,
        faseAtual: fase,
        exercicio: ph.exercicio,
        objeto,
        julgado,
        bancasSlug: [SLUG_HA],
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processoIdByNumero.set(created.numero, created.id);
    placeholdersCriados++;
    placeholdersLista.push(`${ph.numero} (${ph.municipio}, ${ph.exercicio}, ${ph.relator})`);
    console.log(`  [ok] ${ph.numero} | ${ph.municipio} | ${camara} | ${fase} (placeholder)`);
  }

  // ETAPA 7: subprocessos henrique puros
  console.log("\n--- ETAPA 7: cadastrando subprocessos henrique puros ---");
  let subPurosCadastrados = 0;
  for (const s of SUBPROCESSOS) {
    let paiId = processoIdByNumero.get(s.processoPaiNumero);
    if (!paiId) {
      const found = await prisma.processoTce.findFirst({
        where: { numero: s.processoPaiNumero },
        select: { id: true },
      });
      paiId = found?.id;
    }
    if (!paiId) {
      const erro = `Subprocesso ${s.processoPaiNumero}${s.sufixo}: pai nao encontrado`;
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
        bancasSlug: [SLUG_HA],
      },
    });
    subPurosCadastrados++;
    console.log(
      `  [ok] ${numero.padEnd(20)} | ${s.tipoRecurso} | ${s.relator} | ${fase}`,
    );
  }

  // Resumo
  console.log("\n========== RESUMO ==========");
  console.log(`Entidades especiais novas criadas: ${entidadesCriadas}`);
  console.log(`Compartilhados ProcessoTce atualizados: ${compartilhadosOk}`);
  console.log(`Compartilhados SubprocessoTce atualizados: ${compartilhadosSubOk}`);
  console.log(
    `Subprocessos compartilhados novos: ${subCompartilhadosNovos} / ${SUB_COMPARTILHADOS_NOVOS.length}`,
  );
  console.log(
    `Processos principais novos cadastrados: ${principaisCadastrados} / ${PROCESSOS.length} (inclui 255633)`,
  );
  console.log(`Placeholders criados: ${placeholdersCriados} / ${PLACEHOLDERS.length}`);
  console.log(`Subprocessos henrique puros cadastrados: ${subPurosCadastrados} / ${SUBPROCESSOS.length}`);
  console.log(
    `\nSubprocessos no total nesta sessao: ${subCompartilhadosNovos + subPurosCadastrados}`,
  );

  console.log(`\nProcesso 255633 cadastrado como AUDITORIA_ESPECIAL com nota:`);
  console.log(`  - Sao Caetano, 2025, sem relator, julgado`);
  console.log(`  - Tipo originalmente solicitado: Embargos de Declaracao (nao consta no enum, mapeado)`);
  console.log(`  - Numero provisorio em admissibilidade`);

  console.log(`\nPlaceholders criados (REVISAR DEPOIS):`);
  placeholdersLista.forEach((p) => console.log(`  - ${p}`));

  if (avisos.length > 0) {
    console.log(`\nAvisos (${avisos.length}):`);
    avisos.forEach((a) => console.log(`  - ${a}`));
  }
  if (erros.length > 0) {
    console.log(`\nErros (${erros.length}):`);
    erros.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log("\nSem erros.");
  }

  // Conferencia final
  const totalHa = await prisma.processoTce.count({
    where: { bancasSlug: { has: SLUG_HA } },
  });
  const totalHaSub = await prisma.subprocessoTce.count({
    where: { bancasSlug: { has: SLUG_HA } },
  });
  console.log(
    `\nProcessoTce com henrique: ${totalHa} | SubprocessoTce com henrique: ${totalHaSub}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
