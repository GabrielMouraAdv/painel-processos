// Cadastro dos processos reais do escritorio Gabriel Moura Advocacia
// (banca gabriel-moura). Roda manualmente:
//   npx tsx prisma/seed-real-gabriel-moura.ts
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

const SLUG_GM = "gabriel-moura";
const SLUG_PR = "porto-rodrigues";

// ---------- Aliases relator (mesmo das sessoes anteriores) ----------
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
  return CamaraTce.PLENO; // substituto / desconhecido
}

// ---------- Estagios ----------
type Estagio = "EM_INSTRUCAO" | "EM_JULGAMENTO" | "JULGADO" | "JULGADO_RECORRIDO";

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

// ---------- Entidades especiais novas ----------
const ENTIDADES_NOVAS: { nome: string; uf: string; observacoes?: string }[] = [
  {
    nome: "Instituto Previdencia Manari",
    uf: "PE",
    observacoes:
      "Instituto de Previdencia dos Servidores Publicos de Manari - autarquia previdenciaria",
  },
];

// ---------- Compartilhados (apenas adicionar gabriel-moura) ----------
const COMPARTILHADOS = ["25100253-6", "24101134-6"];

// ---------- Processos principais novos ----------
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
  { numero: "PI2500986", municipio: "Arcoverde", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2025", relator: "Carlos da Costa Pinto Neves Filho", estagio: "JULGADO", objetoExtra: "Fiscalizacao - Auditoria (Concluida)" },
  { numero: "26100314-8", municipio: "Arcoverde", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { numero: "25101770-9", municipio: "Sao Jose do Egito", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2025", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { numero: "25101730-8", municipio: "Arcoverde", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2025", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { numero: "25101399-6", municipio: "Arcoverde", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2025", relator: "Carlos da Costa Pinto Neves Filho", estagio: "JULGADO_RECORRIDO" },
  { numero: "25101250-5", municipio: "Arcoverde", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2025", relator: "Carlos da Costa Pinto Neves Filho", estagio: "JULGADO" },
  { numero: "25100668-2", municipio: "Manari", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2024", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { numero: "25100260-3", municipio: "Arcoverde", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2025", relator: "Carlos da Costa Pinto Neves Filho", estagio: "JULGADO" },
  { numero: "24101200-4", municipio: "Manari", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2019-2020", relator: "Rodrigo Novaes", estagio: "EM_JULGAMENTO" },
  { numero: "24100368-4", municipio: "Manari", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2024", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { numero: "24100339-8", municipio: "Instituto Previdencia Manari", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2025", relator: "Adriano Cisneiros", estagio: "EM_JULGAMENTO" },
];

// ---------- Placeholders para subprocessos (24100628-4 e 24100184-5) ----------
type PlaceholderInput = {
  numero: string;
  municipio: string;
  relator: string;
  estagio: Estagio;
};

const PLACEHOLDERS: PlaceholderInput[] = [
  { numero: "24100628-4", municipio: "Manari", relator: "Marcos Loreto", estagio: "JULGADO_RECORRIDO" },
  { numero: "24100184-5", municipio: "Manari", relator: "Marcos Loreto", estagio: "JULGADO_RECORRIDO" },
];

// ---------- Subprocessos ----------
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
  { processoPaiNumero: "24100628-4", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2025", relator: "Marcos Loreto", estagio: "JULGADO" },
  { processoPaiNumero: "24100184-5", sufixo: "RO002", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 2, exercicio: "2025", relator: "Marcos Loreto", estagio: "JULGADO" },
  { processoPaiNumero: "24100184-5", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2025", relator: "Marcos Loreto", estagio: "JULGADO" },
  { processoPaiNumero: "24100184-5", sufixo: "ED004", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 4, exercicio: "2025", relator: "Marcos Loreto", estagio: "JULGADO" },
  { processoPaiNumero: "24100184-5", sufixo: "ED003", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 3, exercicio: "2025", relator: "Marcos Loreto", estagio: "JULGADO" },
];

// ---------- Ignorados (registrados no relatorio) ----------
const IGNORADOS = [
  "26100411-6 (Sao Jose do Belmonte - municipio nao cadastrado)",
  "25101406-0AR001 (Consorcio Mata Sul Pernambucana - entidade nao cadastrada)",
];

// ---------- Execucao ----------
async function main() {
  const erros: string[] = [];

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

  // ETAPA 2: compartilhados (PR + GM)
  console.log("\n--- ETAPA 2: atualizando compartilhados (PR + GM) ---");
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
    const novo = Array.from(new Set([...found.bancasSlug, SLUG_PR, SLUG_GM]));
    await prisma.processoTce.update({
      where: { id: found.id },
      data: { bancasSlug: novo },
    });
    compartilhadosOk++;
    console.log(`  [ok] ${numero} -> [${novo.join(", ")}]`);
  }

  // Mapa municipio nome -> id
  const municipiosDoEscritorio = await prisma.municipio.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, nome: true },
  });
  const municipioByNome = new Map(
    municipiosDoEscritorio.map((m) => [m.nome, m.id]),
  );

  // ETAPA 3: cadastrar processos principais novos (GM)
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
        bancasSlug: [SLUG_GM],
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processoIdByNumero.set(created.numero, created.id);
    principaisCadastrados++;
    console.log(`  [ok] ${p.numero} | ${p.municipio} | ${camara} | ${fase}`);
  }

  // ETAPA 4a: cadastrar placeholders para subprocessos
  console.log("\n--- ETAPA 4a: cadastrando processos pai placeholder ---");
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
    const { fase, julgado } = faseDoEstagio(ph.estagio);
    const objeto = `[Placeholder] Processo cadastrado para abrigar recursos (subprocessos) ja interpostos. Os dados originais do processo principal (autuacao, intimacao, valor, fase real) devem ser preenchidos posteriormente.`;

    const created = await prisma.processoTce.create({
      data: {
        numero: ph.numero,
        tipo: TipoProcessoTce.AUDITORIA_ESPECIAL,
        municipioId,
        relator: ph.relator,
        camara,
        faseAtual: fase,
        exercicio: null,
        objeto,
        julgado,
        bancasSlug: [SLUG_GM],
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processoIdByNumero.set(created.numero, created.id);
    placeholdersCriados++;
    console.log(`  [ok] ${ph.numero} | ${ph.municipio} | ${camara} | ${fase} (placeholder)`);
  }

  // ETAPA 4b: subprocessos
  console.log("\n--- ETAPA 4b: cadastrando subprocessos ---");
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
        bancasSlug: [SLUG_GM],
      },
    });
    subCadastrados++;
    console.log(`  [ok] ${numero} | ${s.tipoRecurso} | ${s.relator} | ${fase}`);
  }

  // Resumo
  console.log("\n========== RESUMO ==========");
  console.log(`Entidades especiais novas criadas: ${entidadesCriadas}`);
  console.log(`Compartilhados PR+GM atualizados: ${compartilhadosOk}`);
  console.log(`Processos principais novos cadastrados: ${principaisCadastrados} / ${PROCESSOS.length}`);
  console.log(`Placeholders criados: ${placeholdersCriados} / ${PLACEHOLDERS.length}`);
  console.log(`Subprocessos cadastrados: ${subCadastrados} / ${SUBPROCESSOS.length}`);
  console.log(`\nIgnorados (conforme instrucao):`);
  IGNORADOS.forEach((i) => console.log(`  - ${i}`));
  if (erros.length > 0) {
    console.log(`\nErros (${erros.length}):`);
    erros.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log("\nSem erros.");
  }

  // Conferencia final
  const totalGm = await prisma.processoTce.count({
    where: { bancasSlug: { has: SLUG_GM } },
  });
  const totalGmSub = await prisma.subprocessoTce.count({
    where: { bancasSlug: { has: SLUG_GM } },
  });
  console.log(
    `\nProcessoTce com gabriel-moura: ${totalGm} | SubprocessoTce com gabriel-moura: ${totalGmSub}`,
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
