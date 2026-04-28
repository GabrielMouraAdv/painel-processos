// Cadastro dos processos reais do escritorio Heloisa Cavalcanti Advocacia
// (banca heloisa). Roda manualmente:
//   npx tsx prisma/seed-real-heloisa.ts

import {
  PrismaClient,
  CamaraTce,
  TipoProcessoTce,
  TipoRecursoTce,
} from "@prisma/client";
import { TCE_CAMARAS } from "../lib/tce-config";

const prisma = new PrismaClient();

const SLUG_HC = "heloisa";
const SLUG_PR = "porto-rodrigues";

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

// ETAPA 1: municipios novos
const MUNICIPIOS_NOVOS = [
  { nome: "Santa Maria da Boa Vista", uf: "PE" },
];

// ETAPA 2: compartilhados (acrescentar heloisa)
const COMPARTILHADOS_PROC = [
  "25101770-9",
  "25101124-0",
  "25100764-9",
  "24101320-3",
  "23101050-3",
];
const COMPARTILHADOS_SUB = ["23101050-3RO002"];

// ETAPA 3: subprocessos novos do 23101050-3 com [porto-rodrigues, heloisa]
type SubProcCompartilhado = {
  processoPaiNumero: string;
  sufixo: string;
  tipoRecurso: TipoRecursoTce;
  numeroSequencial: number;
  exercicio: string;
  relator: string;
  estagio: Estagio;
  bancasSlug: string[];
};

const SUBPROCESSOS_COMPARTILHADOS_NOVOS: SubProcCompartilhado[] = [
  { processoPaiNumero: "23101050-3", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO", bancasSlug: [SLUG_PR, SLUG_HC] },
  { processoPaiNumero: "23101050-3", sufixo: "ED001", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 1, exercicio: "2025", relator: "Ruy Ricardo Harten", estagio: "JULGADO", bancasSlug: [SLUG_PR, SLUG_HC] },
  { processoPaiNumero: "23101050-3", sufixo: "ED002", tipoRecurso: TipoRecursoTce.EMBARGOS_DECLARACAO, numeroSequencial: 2, exercicio: "2025", relator: "Ruy Ricardo Harten", estagio: "JULGADO", bancasSlug: [SLUG_PR, SLUG_HC] },
];

// ETAPA 4: processos principais novos com [heloisa]
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
  { numero: "PI2500681", municipio: "Vitoria de Santo Antao", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2025", relator: "Ranilson Ramos", estagio: "JULGADO", objetoExtra: "Fiscalizacao - Auditoria (Concluida)" },
  { numero: "PI2500116", municipio: "Instituto Previdencia Sao Bento do Una", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2022-2025", relator: "Carlos da Costa Pinto Neves Filho", estagio: "JULGADO", objetoExtra: "Fiscalizacao - Auditoria (Concluida)" },
  { numero: "26100413-0", municipio: "Santa Maria da Boa Vista", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO" },
  { numero: "25100003-5", municipio: "Vitoria de Santo Antao", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO" },
  { numero: "23100464-3", municipio: "Vitoria de Santo Antao", tipo: TipoProcessoTce.TERMO_AJUSTE_GESTAO, exercicio: "2023", relator: "Eduardo Porto", estagio: "JULGADO" },
];

// ETAPA 5: placeholder
type PlaceholderInput = {
  numero: string;
  municipio: string;
  exercicio: string;
  relator: string;
};
const PLACEHOLDERS: PlaceholderInput[] = [
  { numero: "24100455-0", municipio: "Lagoa dos Gatos", exercicio: "2024", relator: "Rodrigo Novaes" },
];

// ETAPA 6: subprocesso com [heloisa]
type SubprocessoInput = {
  processoPaiNumero: string;
  sufixo: string;
  tipoRecurso: TipoRecursoTce;
  numeroSequencial: number;
  exercicio: string;
  relator: string;
  estagio: Estagio;
};
const SUBPROCESSOS_HELOISA: SubprocessoInput[] = [
  { processoPaiNumero: "24100455-0", sufixo: "RO001", tipoRecurso: TipoRecursoTce.RECURSO_ORDINARIO, numeroSequencial: 1, exercicio: "2025", relator: "Rodrigo Novaes", estagio: "JULGADO" },
];

async function main() {
  const erros: string[] = [];

  const escritorio = await prisma.escritorio.findFirst({
    select: { id: true, nome: true },
  });
  if (!escritorio) throw new Error("Nenhum escritorio cadastrado.");
  console.log(`Escritorio alvo: ${escritorio.nome} (${escritorio.id})`);

  // ETAPA 1
  console.log("\n--- ETAPA 1: criando municipios novos ---");
  let municipiosCriados = 0;
  for (const m of MUNICIPIOS_NOVOS) {
    const ja = await prisma.municipio.findFirst({
      where: { nome: m.nome, escritorioId: escritorio.id },
      select: { id: true },
    });
    if (ja) {
      console.log(`  [skip] ${m.nome} ja existe`);
      continue;
    }
    await prisma.municipio.create({
      data: { nome: m.nome, uf: m.uf, escritorioId: escritorio.id },
    });
    municipiosCriados++;
    console.log(`  [criado] ${m.nome}/${m.uf}`);
  }

  // ETAPA 2: compartilhados (proc + sub)
  console.log("\n--- ETAPA 2: atualizando compartilhados (acrescentar heloisa) ---");
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
    const novo = Array.from(new Set([...found.bancasSlug, SLUG_HC]));
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
    const novo = Array.from(new Set([...found.bancasSlug, SLUG_HC]));
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

  // ETAPA 3: subprocessos compartilhados novos do 23101050-3
  console.log("\n--- ETAPA 3: subprocessos novos do 23101050-3 (PR + HC) ---");
  let subCompartilhadosNovos = 0;
  // processo pai precisa existir (ja existe)
  const pai23101050 = await prisma.processoTce.findFirst({
    where: { numero: "23101050-3" },
    select: { id: true },
  });
  for (const s of SUBPROCESSOS_COMPARTILHADOS_NOVOS) {
    if (!pai23101050) {
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
        processoPaiId: pai23101050.id,
        numero,
        tipoRecurso: s.tipoRecurso,
        numeroSequencial: s.numeroSequencial,
        dataInterposicao,
        fase,
        relator: s.relator,
        bancasSlug: s.bancasSlug,
      },
    });
    subCompartilhadosNovos++;
    console.log(
      `  [ok] ${numero} | ${s.tipoRecurso} | ${s.relator} | ${fase} | [${s.bancasSlug.join(", ")}]`,
    );
  }

  // ETAPA 4: processos principais novos
  console.log("\n--- ETAPA 4: cadastrando processos principais novos ---");
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
        bancasSlug: [SLUG_HC],
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processoIdByNumero.set(created.numero, created.id);
    principaisCadastrados++;
    console.log(`  [ok] ${p.numero} | ${p.municipio} | ${camara} | ${fase}`);
  }

  // ETAPA 5: placeholder
  console.log("\n--- ETAPA 5: cadastrando placeholders ---");
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
        bancasSlug: [SLUG_HC],
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processoIdByNumero.set(created.numero, created.id);
    placeholdersCriados++;
    placeholdersLista.push(`${ph.numero} (${ph.municipio}, ${ph.exercicio}, ${ph.relator})`);
    console.log(`  [ok] ${ph.numero} | ${ph.municipio} | ${camara} | ${fase} (placeholder)`);
  }

  // ETAPA 6: subprocesso heloisa
  console.log("\n--- ETAPA 6: cadastrando subprocesso heloisa ---");
  let subHeloisaCadastrados = 0;
  for (const s of SUBPROCESSOS_HELOISA) {
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
        bancasSlug: [SLUG_HC],
      },
    });
    subHeloisaCadastrados++;
    console.log(`  [ok] ${numero} | ${s.tipoRecurso} | ${s.relator} | ${fase} | [heloisa]`);
  }

  // Resumo
  console.log("\n========== RESUMO ==========");
  console.log(`Municipios novos criados: ${municipiosCriados}`);
  console.log(`Compartilhados ProcessoTce atualizados: ${compartilhadosOk}`);
  console.log(`Compartilhados SubprocessoTce atualizados: ${compartilhadosSubOk}`);
  console.log(`Subprocessos compartilhados novos (PR+HC): ${subCompartilhadosNovos} / ${SUBPROCESSOS_COMPARTILHADOS_NOVOS.length}`);
  console.log(`Processos principais novos cadastrados: ${principaisCadastrados} / ${PROCESSOS.length}`);
  console.log(`Placeholders criados: ${placeholdersCriados} / ${PLACEHOLDERS.length}`);
  console.log(`Subprocessos heloisa puros cadastrados: ${subHeloisaCadastrados} / ${SUBPROCESSOS_HELOISA.length}`);
  console.log(
    `\nSubprocessos novos no total: ${subCompartilhadosNovos + subHeloisaCadastrados}`,
  );
  console.log(`\nPlaceholders criados (REVISAR DEPOIS):`);
  placeholdersLista.forEach((p) => console.log(`  - ${p}`));
  if (erros.length > 0) {
    console.log(`\nErros (${erros.length}):`);
    erros.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log("\nSem erros.");
  }

  // Conferencia final
  const totalHc = await prisma.processoTce.count({
    where: { bancasSlug: { has: SLUG_HC } },
  });
  const totalHcSub = await prisma.subprocessoTce.count({
    where: { bancasSlug: { has: SLUG_HC } },
  });
  console.log(
    `\nProcessoTce com heloisa: ${totalHc} | SubprocessoTce com heloisa: ${totalHcSub}`,
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
