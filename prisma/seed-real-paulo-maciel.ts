// Cadastro dos processos reais do escritorio Paulo Maciel Advocacia
// (banca paulo-maciel). Roda manualmente:
//   npx tsx prisma/seed-real-paulo-maciel.ts

import {
  PrismaClient,
  CamaraTce,
  TipoProcessoTce,
  TipoRecursoTce,
} from "@prisma/client";
import { TCE_CAMARAS } from "../lib/tce-config";

const prisma = new PrismaClient();

const SLUG_PM = "paulo-maciel";
const SLUG_PR = "porto-rodrigues";

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
const RELATORES_FORA_COMPOSICAO = new Set<string>(["Teresa Duere"]);

function camaraDoRelator(
  relatorRaw: string | null,
  warn?: (msg: string) => void,
): CamaraTce {
  if (!relatorRaw) return CamaraTce.PLENO;
  const nomeBase = RELATOR_ALIAS[relatorRaw] ?? relatorRaw;
  if (PRIMEIRA_TITULARES.has(nomeBase)) return CamaraTce.PRIMEIRA;
  if (SEGUNDA_TITULARES.has(nomeBase)) return CamaraTce.SEGUNDA;
  if (nomeBase === PLENO_PRESIDENTE) return CamaraTce.PLENO;
  if (RELATORES_FORA_COMPOSICAO.has(nomeBase) && warn) {
    warn(
      `Relator "${relatorRaw}" nao esta na composicao cadastrada — usando PLENO como fallback`,
    );
  }
  return CamaraTce.PLENO;
}

// ---------- Estagios ----------
type Estagio =
  | "EM_INSTRUCAO"
  | "EM_JULGAMENTO"
  | "JULGADO"
  | "JULGADO_RECORRIDO"
  | "ARQUIVADO";

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
    case "ARQUIVADO":
      return { fase: "arquivado", julgado: true };
  }
}

// ---------- Entidades especiais novas ----------
const ENTIDADES_NOVAS: { nome: string; uf: string; observacoes?: string }[] = [
  {
    nome: "Instituto Previdencia Brejo da Madre de Deus",
    uf: "PE",
    observacoes:
      "Instituto de Previdencia dos Servidores Municipais de Brejo da Madre de Deus (Plano Previdenciario) - autarquia previdenciaria",
  },
  {
    nome: "Secretaria Desenvolvimento Agrario PE",
    uf: "PE",
    observacoes: "Secretaria de Desenvolvimento Agrario de Pernambuco - secretaria estadual",
  },
  {
    nome: "Instituto Previdencia Garanhuns",
    uf: "PE",
    observacoes:
      "Instituto de Previdencia dos Servidores Publicos do Municipio de Garanhuns - autarquia previdenciaria",
  },
];

// ---------- Compartilhados (acrescentar paulo-maciel) ----------
const COMPARTILHADOS = ["25101770-9", "24101338-0"];

// ---------- Processos principais novos (12) ----------
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
  { numero: "25100410-7", municipio: "Brejo da Madre de Deus", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023-2024", relator: "Dirceu Rodolfo Junior", estagio: "EM_JULGAMENTO" },
  { numero: "25100314-0", municipio: "Instituto Previdencia Brejo da Madre de Deus", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023-2025", relator: "Marcos Loreto", estagio: "EM_JULGAMENTO" },
  { numero: "24100300-3", municipio: "Secretaria Desenvolvimento Agrario PE", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2022", relator: "Marcos Flavio Tenorio de Almeida", estagio: "EM_JULGAMENTO" },
  { numero: "24100292-8", municipio: "Secretaria Desenvolvimento Agrario PE", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2022", relator: "Dirceu Rodolfo Junior", estagio: "EM_JULGAMENTO" },
  { numero: "24100153-5", municipio: "Secretaria Desenvolvimento Agrario PE", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2022", relator: "Dirceu Rodolfo Junior", estagio: "EM_JULGAMENTO" },
  { numero: "23100991-4", municipio: "Brejo da Madre de Deus", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2022", relator: "Marcos Flavio Tenorio de Almeida", estagio: "JULGADO" },
  { numero: "20100335-1", municipio: "Ingazeira", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2019", relator: "Valdecir Pascoal", estagio: "ARQUIVADO", objetoExtra: "Arquivado - Julgado pelo Legislativo" },
  { numero: "20100153-6", municipio: "Garanhuns", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2019", relator: "Marcos Loreto", estagio: "ARQUIVADO", objetoExtra: "Arquivado - Julgado pelo Legislativo apos Recursos" },
  { numero: "19100062-0", municipio: "Garanhuns", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2018", relator: "Ranilson Ramos", estagio: "ARQUIVADO", objetoExtra: "Arquivado - Julgado pelo Legislativo" },
  { numero: "24100483-4", municipio: "Brejo da Madre de Deus", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2023", relator: "Marcos Flavio Tenorio de Almeida", estagio: "JULGADO_RECORRIDO" },
  { numero: "23100842-9", municipio: "Instituto Previdencia Garanhuns", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2018-2020", relator: "Marcos Loreto", estagio: "JULGADO_RECORRIDO" },
  { numero: "23100519-2", municipio: "Brejo da Madre de Deus", tipo: TipoProcessoTce.TERMO_AJUSTE_GESTAO, exercicio: "2023", relator: "Dirceu Rodolfo Junior", estagio: "JULGADO_RECORRIDO" },
];

// ---------- Placeholders (8) ----------
type PlaceholderInput = {
  numero: string;
  municipio: string;
  exercicio: string;
  relator: string;
};

const PLACEHOLDERS: PlaceholderInput[] = [
  { numero: "24101354-9", municipio: "Brejo da Madre de Deus", exercicio: "2024", relator: "Rodrigo Novaes" },
  { numero: "23100715-2", municipio: "Brejo da Madre de Deus", exercicio: "2023", relator: "Marcos Loreto" },
  { numero: "22100920-6", municipio: "Brejo da Madre de Deus", exercicio: "2022", relator: "Marcos Loreto" },
  { numero: "20100333-8", municipio: "Ingazeira", exercicio: "2020", relator: "Carlos da Costa Pinto Neves Filho" },
  { numero: "18100331-4", municipio: "Garanhuns", exercicio: "2018", relator: "Rodrigo Novaes" },
  { numero: "18100320-0", municipio: "Garanhuns", exercicio: "2018", relator: "Ricardo Rios" },
  { numero: "16100392-8", municipio: "Ingazeira", exercicio: "2016", relator: "Teresa Duere" },
  { numero: "15100384-1", municipio: "Brejo da Madre de Deus", exercicio: "2015", relator: "Alda Magalhaes" },
];

// ---------- Subprocessos (22) ----------
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
  { processoPaiNumero: "24101354-9", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2025", relator: "Rodrigo Novaes", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  // Subprocessos compartilhados (do 24101338-0 que e [porto-rodrigues + paulo-maciel])
  { processoPaiNumero: "24101338-0", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2026", relator: "Dirceu Rodolfo Junior", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PR, SLUG_PM] },
  { processoPaiNumero: "24101338-0", sufixo: "ED002", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 2, exercicio: "2026", relator: "Dirceu Rodolfo Junior", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PR, SLUG_PM] },
  { processoPaiNumero: "24100483-4", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2026", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "23100842-9", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2025", relator: "Marcos Loreto", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "23100842-9", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2025", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "23100715-2", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2024", relator: "Marcos Loreto", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "23100519-2", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2025", relator: "Dirceu Rodolfo Junior", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "23100519-2", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "22100920-6", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2024", relator: "Marcos Loreto", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "20100333-8", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2024", relator: "Ranilson Ramos", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "20100333-8", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2025", relator: "Carlos da Costa Pinto Neves Filho", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "18100331-4", sufixo: "ED002", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 2, exercicio: "2025", relator: "Rodrigo Novaes", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "18100331-4", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2023", relator: "Rodrigo Novaes", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "18100320-0", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2023", relator: "Adriano Cisneiros", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "18100320-0", sufixo: "ED002", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 2, exercicio: "2023", relator: "Ricardo Rios", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "18100320-0", sufixo: "RO004", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 4, exercicio: "2023", relator: "Ricardo Rios", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "16100392-8", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2021", relator: "Teresa Duere", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "16100392-8", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2018", relator: "Teresa Duere", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "15100384-1", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2021", relator: "Marcos Nobrega", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "15100384-1", sufixo: "ED002", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 2, exercicio: "2023", relator: "Alda Magalhaes", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
  { processoPaiNumero: "15100384-1", sufixo: "RO002", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 2, exercicio: "2022", relator: "Alda Magalhaes", estagio: "JULGADO", bancasSlug: [SLUG_PM] },
];

async function main() {
  const erros: string[] = [];
  const avisos: string[] = [];
  const warn = (msg: string) => avisos.push(msg);

  const escritorio = await prisma.escritorio.findFirst({
    select: { id: true, nome: true },
  });
  if (!escritorio) {
    throw new Error("Nenhum escritorio cadastrado. Abortando.");
  }
  console.log(`Escritorio alvo: ${escritorio.nome} (${escritorio.id})`);

  // ETAPA 1: criar entidades especiais
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

  // ETAPA 2: compartilhados (acrescentar paulo-maciel)
  console.log("\n--- ETAPA 2: atualizando compartilhados ---");
  let compartilhadosOk = 0;
  for (const numero of COMPARTILHADOS) {
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
    const novo = Array.from(new Set([...found.bancasSlug, SLUG_PM]));
    await prisma.processoTce.update({
      where: { id: found.id },
      data: { bancasSlug: novo },
    });
    compartilhadosOk++;
    console.log(`  [ok] ${numero} -> [${novo.join(", ")}]`);
  }

  // Mapa municipio
  const municipiosDoEscritorio = await prisma.municipio.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, nome: true },
  });
  const municipioByNome = new Map(
    municipiosDoEscritorio.map((m) => [m.nome, m.id]),
  );

  // ETAPA 3: processos principais novos
  console.log("\n--- ETAPA 3: cadastrando processos principais novos ---");
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
        bancasSlug: [SLUG_PM],
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processoIdByNumero.set(created.numero, created.id);
    principaisCadastrados++;
    console.log(`  [ok] ${p.numero} | ${p.municipio} | ${camara} | ${fase}`);
  }

  // ETAPA 4: placeholders
  console.log("\n--- ETAPA 4: cadastrando placeholders ---");
  const placeholdersCriadosLista: string[] = [];
  let placeholdersCriados = 0;
  for (const ph of PLACEHOLDERS) {
    const municipioId = municipioByNome.get(ph.municipio);
    if (!municipioId) {
      const erro = `Placeholder ${ph.numero}: municipio '${ph.municipio}' nao encontrado`;
      console.error(`  [ERRO] ${erro}`);
      erros.push(erro);
      continue;
    }
    const camara = camaraDoRelator(ph.relator, warn);
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
        bancasSlug: [SLUG_PM],
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processoIdByNumero.set(created.numero, created.id);
    placeholdersCriados++;
    placeholdersCriadosLista.push(`${ph.numero} (${ph.municipio}, ${ph.exercicio}, ${ph.relator})`);
    console.log(`  [ok] ${ph.numero} | ${ph.municipio} | ${camara} | ${fase} (placeholder)`);
  }

  // ETAPA 5: subprocessos
  console.log("\n--- ETAPA 5: cadastrando subprocessos ---");
  let subCadastrados = 0;
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

  // Resumo
  console.log("\n========== RESUMO ==========");
  console.log(`Entidades especiais novas criadas: ${entidadesCriadas}`);
  console.log(`Compartilhados atualizados: ${compartilhadosOk}`);
  console.log(`Processos principais novos cadastrados: ${principaisCadastrados} / ${PROCESSOS.length}`);
  console.log(`Placeholders criados: ${placeholdersCriados} / ${PLACEHOLDERS.length}`);
  console.log(`Subprocessos cadastrados: ${subCadastrados} / ${SUBPROCESSOS.length}`);
  console.log(`\nPlaceholders criados (REVISAR DEPOIS):`);
  placeholdersCriadosLista.forEach((p) => console.log(`  - ${p}`));
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

  // Conferencia final
  const totalPm = await prisma.processoTce.count({
    where: { bancasSlug: { has: SLUG_PM } },
  });
  const totalPmSub = await prisma.subprocessoTce.count({
    where: { bancasSlug: { has: SLUG_PM } },
  });
  console.log(
    `\nProcessoTce com paulo-maciel: ${totalPm} | SubprocessoTce com paulo-maciel: ${totalPmSub}`,
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
