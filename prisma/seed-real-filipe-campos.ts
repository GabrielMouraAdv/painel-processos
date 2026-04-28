// Limpeza dos ProcessoTce ficticios e cadastro dos processos reais do
// escritorio Filipe Campos. Roda manualmente:
//   npx tsx prisma/seed-real-filipe-campos.ts
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

// ---------- Mapeamento relator -> camara ----------
// Aliases observados na lista do usuario que precisam normalizar para o nome
// cadastrado em TCE_CAMARAS / CONSELHEIROS_SUBSTITUTOS.
const RELATOR_ALIAS: Record<string, string> = {
  "Dirceu Rodolfo Junior": "Dirceu Rodolfo",
  "Carlos Mauricio Figueiredo": "Carlos Mauricio",
  "Carlos da Costa Pinto Neves Filho": "Carlos Neves",
  "Ruy Ricardo Harten": "Ruy Harten",
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
  // Conselheiro substituto -> default Pleno
  return CamaraTce.PLENO;
}

// ---------- Mapeamento estagio -> faseAtual / julgado ----------
type Estagio =
  | "EM_INSTRUCAO"
  | "EM_JULGAMENTO"
  | "SOBRESTADO"
  | "JULGADO"
  | "JULGADO_RECORRIDO"
  | "ARQUIVADO"
  | "EM_ADMISSIBILIDADE";

function faseDoEstagio(e: Estagio): { fase: string; julgado: boolean } {
  switch (e) {
    case "EM_INSTRUCAO":
      return { fase: "em_instrucao", julgado: false };
    case "EM_JULGAMENTO":
      return { fase: "em_julgamento", julgado: false };
    case "SOBRESTADO":
      return { fase: "sobrestado", julgado: false };
    case "JULGADO":
      return { fase: "julgado", julgado: true };
    case "JULGADO_RECORRIDO":
      return { fase: "julgado_recorrido", julgado: true };
    case "ARQUIVADO":
      return { fase: "arquivado", julgado: true };
    case "EM_ADMISSIBILIDADE":
      return { fase: "em_admissibilidade", julgado: false };
  }
}

// ---------- Lista de processos principais ----------
type ProcessoInput = {
  numero: string;
  municipio: string; // nome do municipio (ja cadastrado ou criado neste seed)
  tipo: TipoProcessoTce;
  exercicio: string | null;
  relator: string | null;
  estagio: Estagio;
  objetoExtra?: string; // texto adicional pro campo objeto
};

const PROCESSOS: ProcessoInput[] = [
  { numero: "PI2600096", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "EM_INSTRUCAO", objetoExtra: "Fiscalizacao - Auditoria" },
  { numero: "305300", municipio: "Oroco", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2026", relator: null, estagio: "EM_ADMISSIBILIDADE", objetoExtra: "Embargos de Declaracao - em primeiro juizo de admissibilidade" },
  { numero: "26100484-0", municipio: "Ipojuca", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO" },
  { numero: "26100467-0", municipio: "Ipojuca", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO" },
  { numero: "26100466-9", municipio: "Ipojuca", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO" },
  { numero: "26100461-0", municipio: "Ipojuca", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO" },
  { numero: "26100128-0", municipio: "Olinda", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2026", relator: "Valdecir Pascoal", estagio: "JULGADO_RECORRIDO" },
  { numero: "26100102-4", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Carlos Pimentel", estagio: "EM_INSTRUCAO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "25101687-0", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2025", relator: "Luiz Arcoverde", estagio: "EM_INSTRUCAO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "25101470-8", municipio: "IPSMC Cachoeirinha", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2020-2025", relator: "Ranilson Ramos", estagio: "EM_JULGAMENTO" },
  { numero: "25101430-7", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024-2025", relator: "Valdecir Pascoal", estagio: "EM_INSTRUCAO" },
  { numero: "25101210-4", municipio: "Ipojuca", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2020-2021", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO" },
  { numero: "25101094-6", municipio: "Ipojuca", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024-2025", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO" },
  { numero: "25100993-2", municipio: "Ipojuca", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024-2025", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO" },
  { numero: "25100988-9", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024-2025", relator: "Valdecir Pascoal", estagio: "EM_INSTRUCAO" },
  { numero: "25100902-6", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023", relator: "Carlos Pimentel", estagio: "EM_JULGAMENTO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "25100715-7", municipio: "Betania", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2024", relator: "Valdecir Pascoal", estagio: "EM_JULGAMENTO" },
  { numero: "25100623-2", municipio: "Oroco", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2024", relator: "Rodrigo Novaes", estagio: "JULGADO_RECORRIDO" },
  { numero: "25100433-8", municipio: "Betania", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024-2025", relator: "Rodrigo Novaes", estagio: "EM_INSTRUCAO" },
  { numero: "25100291-3", municipio: "Betania", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2020-2023", relator: "Marcos Loreto", estagio: "EM_INSTRUCAO" },
  { numero: "25100275-5", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Ranilson Ramos", estagio: "EM_INSTRUCAO" },
  { numero: "25100258-5", municipio: "Consorcio Agreste Mata Sul", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2022-2024", relator: "Carlos Mauricio Figueiredo", estagio: "EM_JULGAMENTO" },
  { numero: "25100223-8", municipio: "Ipojuca", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Rodrigo Novaes", estagio: "EM_JULGAMENTO" },
  { numero: "25100001-1", municipio: "Ipojuca", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2025", relator: "Dirceu Rodolfo Junior", estagio: "EM_JULGAMENTO" },
  { numero: "24101187-5", municipio: "Oroco", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2024", relator: "Rodrigo Novaes", estagio: "JULGADO_RECORRIDO" },
  { numero: "24101177-2", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2022-2024", relator: "Ranilson Ramos", estagio: "JULGADO_RECORRIDO" },
  { numero: "24100851-7", municipio: "Cachoeirinha", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023", relator: "Eduardo Porto", estagio: "EM_JULGAMENTO" },
  { numero: "24100673-9", municipio: "Ibimirim", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2022", relator: "Alda Magalhaes", estagio: "JULGADO_RECORRIDO" },
  { numero: "24100651-0", municipio: "Ipojuca", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023", relator: "Marcos Nobrega", estagio: "EM_JULGAMENTO", objetoExtra: "Admissao de Pessoal - Concurso" },
  { numero: "24100528-0", municipio: "Cachoeirinha", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2023", relator: "Eduardo Porto", estagio: "JULGADO" },
  { numero: "23100974-4", municipio: "Consorcio Agreste Mata Sul", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2023", relator: "Ranilson Ramos", estagio: "JULGADO" },
  { numero: "23100957-4", municipio: "Jatoba", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021", relator: "Rodrigo Novaes", estagio: "JULGADO" },
  { numero: "23100951-3", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2023", relator: "Dirceu Rodolfo Junior", estagio: "JULGADO_RECORRIDO" },
  { numero: "23100857-0", municipio: "Olinda", tipo: TipoProcessoTce.MEDIDA_CAUTELAR, exercicio: "2023", relator: "Valdecir Pascoal", estagio: "JULGADO" },
  { numero: "23100768-1", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2022-2023", relator: "Ranilson Ramos", estagio: "JULGADO_RECORRIDO" },
  { numero: "23100343-2", municipio: "Betania", tipo: TipoProcessoTce.TERMO_AJUSTE_GESTAO, exercicio: "2023", relator: "Carlos da Costa Pinto Neves Filho", estagio: "JULGADO_RECORRIDO" },
  { numero: "23100137-0", municipio: "Oroco", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2022", relator: "Ricardo Rios", estagio: "JULGADO_RECORRIDO" },
  { numero: "22100815-9", municipio: "Arcoverde", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2018-2022", relator: "Carlos Pimentel", estagio: "EM_JULGAMENTO" },
  { numero: "22100356-3", municipio: "Cachoeirinha", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2021", relator: "Rodrigo Novaes", estagio: "ARQUIVADO", objetoExtra: "Arquivado Temporariamente - Julgado pelo Legislativo" },
  { numero: "22100147-5", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2021-2022", relator: "Luiz Arcoverde", estagio: "EM_JULGAMENTO" },
  { numero: "21100148-0", municipio: "Goiana", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2020", relator: "Ruy Ricardo Harten", estagio: "EM_JULGAMENTO" },
  { numero: "20100534-7", municipio: "Jaboatao dos Guararapes", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2020", relator: "Rodrigo Novaes", estagio: "JULGADO" },
  { numero: "20100346-6", municipio: "Olinda", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GESTAO, exercicio: "2019", relator: "Adriano Cisneiros", estagio: "JULGADO" },
  { numero: "20100025-8", municipio: "Olinda", tipo: TipoProcessoTce.AUDITORIA_ESPECIAL, exercicio: "2017-2019", relator: "Adriano Cisneiros", estagio: "JULGADO_RECORRIDO" },
  { numero: "19100283-5", municipio: "Belo Jardim", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GESTAO, exercicio: "2018", relator: "Valdecir Pascoal", estagio: "JULGADO_RECORRIDO" },
  { numero: "19100288-4", municipio: "Betania", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2018", relator: "Marcos Loreto", estagio: "JULGADO_RECORRIDO" },
  { numero: "19100277-0", municipio: "Cabrobo", tipo: TipoProcessoTce.PRESTACAO_CONTAS_GOVERNO, exercicio: "2018", relator: "Carlos Pimentel", estagio: "JULGADO_RECORRIDO" },
];

// ---------- Lista de subprocessos (recursos) ----------
type SubprocessoInput = {
  processoPaiNumero: string;
  sufixo: string; // ex "ED001", "RO001", "AR002", "AG001"
  tipoRecurso: TipoRecursoTce;
  numeroSequencial: number;
  exercicio: string; // ano de interposicao (placeholder data)
  relator: string;
  estagio: Estagio;
};

function subProc(
  pai: string,
  sufixo: string,
  tipoRecurso: TipoRecursoTce,
  numeroSequencial: number,
  exercicio: string,
  relator: string,
  estagio: Estagio,
): SubprocessoInput {
  return { processoPaiNumero: pai, sufixo, tipoRecurso, numeroSequencial, exercicio, relator, estagio };
}

const SUBPROCESSOS: SubprocessoInput[] = [
  // EDs do 25100001-1: ED001..ED009 (Dirceu Rodolfo Junior, Em Julgamento)
  ...Array.from({ length: 9 }, (_, i) =>
    subProc(
      "25100001-1",
      `ED${String(i + 1).padStart(3, "0")}`,
      TipoRecursoTce.EMBARGOS_DECLARACAO,
      i + 1,
      "2025",
      "Dirceu Rodolfo Junior",
      "EM_JULGAMENTO",
    ),
  ),
  // ARs do 25100001-1: AR002..AR010 (Dirceu Rodolfo Junior, Julgado-Recorrido)
  ...Array.from({ length: 9 }, (_, i) =>
    subProc(
      "25100001-1",
      `AR${String(i + 2).padStart(3, "0")}`,
      TipoRecursoTce.AGRAVO_REGIMENTAL,
      i + 2,
      "2025",
      "Dirceu Rodolfo Junior",
      "JULGADO_RECORRIDO",
    ),
  ),
  subProc("24101187-5", "RO001", TipoRecursoTce.RECURSO_ORDINARIO, 1, "2025", "Alda Magalhaes", "JULGADO"),
  subProc("24101177-2", "RO001", TipoRecursoTce.RECURSO_ORDINARIO, 1, "2025", "Rodrigo Novaes", "JULGADO_RECORRIDO"),
  subProc("24101177-2", "ED002", TipoRecursoTce.EMBARGOS_DECLARACAO, 2, "2026", "Rodrigo Novaes", "EM_JULGAMENTO"),
  subProc("23100951-3", "RO001", TipoRecursoTce.RECURSO_ORDINARIO, 1, "2026", "Eduardo Porto", "EM_JULGAMENTO"),
  subProc("23100951-3", "RO002", TipoRecursoTce.RECURSO_ORDINARIO, 2, "2026", "Eduardo Porto", "EM_JULGAMENTO"),
  subProc("23100951-3", "RO003", TipoRecursoTce.RECURSO_ORDINARIO, 3, "2026", "Eduardo Porto", "EM_JULGAMENTO"),
  subProc("23100768-1", "ED002", TipoRecursoTce.EMBARGOS_DECLARACAO, 2, "2025", "Ranilson Ramos", "EM_JULGAMENTO"),
  subProc("23100343-2", "ED001", TipoRecursoTce.EMBARGOS_DECLARACAO, 1, "2025", "Valdecir Pascoal", "JULGADO"),
  subProc("23100137-0", "ED001", TipoRecursoTce.EMBARGOS_DECLARACAO, 1, "2025", "Ricardo Rios", "SOBRESTADO"),
  subProc("19100288-4", "AG001", TipoRecursoTce.AGRAVO, 1, "2025", "Marcos Loreto", "EM_JULGAMENTO"),
  subProc("19100277-0", "RO001", TipoRecursoTce.RECURSO_ORDINARIO, 1, "2022", "Carlos da Costa Pinto Neves Filho", "JULGADO_RECORRIDO"),
  subProc("19100277-0", "ED002", TipoRecursoTce.EMBARGOS_DECLARACAO, 2, "2024", "Carlos Pimentel", "EM_JULGAMENTO"),
];

// ---------- Municipios novos ----------
const MUNICIPIOS_A_CRIAR: { nome: string; uf: string; observacoes?: string }[] = [
  { nome: "Ibimirim", uf: "PE" },
  { nome: "Goiana", uf: "PE" },
  { nome: "Jaboatao dos Guararapes", uf: "PE" },
  { nome: "Belo Jardim", uf: "PE" },
  { nome: "Jatoba", uf: "PE" },
  {
    nome: "Consorcio Agreste Mata Sul",
    uf: "PE",
    observacoes: "Consorcio de Municipios do Agreste e Mata Sul de Pernambuco - entidade especial",
  },
  {
    nome: "IPSMC Cachoeirinha",
    uf: "PE",
    observacoes:
      "Instituto de Previdencia dos Servidores Municipais de Cachoeirinha (IPSMC) - autarquia previdenciaria",
  },
];

// ---------- Execucao ----------
async function main() {
  const erros: string[] = [];

  // 0) Identificar escritorio
  const escritorio = await prisma.escritorio.findFirst({
    select: { id: true, nome: true },
  });
  if (!escritorio) {
    throw new Error("Nenhum escritorio cadastrado. Abortando.");
  }
  console.log(`Escritorio alvo: ${escritorio.nome} (${escritorio.id})`);

  // 1) Limpar ProcessoTce e tudo dependente
  console.log("\n--- ETAPA 1: limpando processos TCE existentes ---");
  const before = await prisma.processoTce.count();
  console.log(`ProcessoTce antes: ${before}`);

  // Apaga em ordem (dependencias mais profundas primeiro)
  // SubprocessoTce -> Prazo/Andamento/Documento Subprocesso (cascade ja configurado)
  // ProcessoTce -> Subprocesso, Interessado, Andamento, Prazo, Documento, ItemPauta
  await prisma.prazoSubprocessoTce.deleteMany({});
  await prisma.andamentoSubprocessoTce.deleteMany({});
  await prisma.documentoSubprocessoTce.deleteMany({});
  await prisma.subprocessoTce.deleteMany({});

  await prisma.itemPauta.deleteMany({});
  await prisma.prazoTce.deleteMany({});
  await prisma.andamentoTce.deleteMany({});
  await prisma.documentoTce.deleteMany({});
  await prisma.interessadoProcessoTce.deleteMany({});
  await prisma.processoTce.deleteMany({});

  const after = await prisma.processoTce.count();
  console.log(`ProcessoTce depois: ${after}`);

  // 2) Criar municipios faltantes
  console.log("\n--- ETAPA 2: criando municipios ---");
  let municipiosCriados = 0;
  for (const m of MUNICIPIOS_A_CRIAR) {
    const ja = await prisma.municipio.findFirst({
      where: { nome: m.nome, escritorioId: escritorio.id },
      select: { id: true },
    });
    if (ja) {
      console.log(`  [skip] ${m.nome}/${m.uf} ja existe`);
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
    municipiosCriados++;
    console.log(`  [criado] ${m.nome}/${m.uf}`);
  }

  // 3) Cadastrar processos principais
  console.log("\n--- ETAPA 3: cadastrando processos principais ---");
  // Mapa nome do municipio -> id
  const municipiosDoEscritorio = await prisma.municipio.findMany({
    where: { escritorioId: escritorio.id },
    select: { id: true, nome: true },
  });
  const municipioByNome = new Map(municipiosDoEscritorio.map((m) => [m.nome, m.id]));

  // Para subprocessos, preciso do id do processo pai. Vou guardar.
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
        escritorioId: escritorio.id,
      },
      select: { id: true, numero: true },
    });
    processoIdByNumero.set(created.numero, created.id);
    principaisCadastrados++;
    console.log(`  [ok] ${p.numero} | ${p.municipio} | ${p.tipo} | ${camara} | ${fase}`);
  }

  // 4) Cadastrar subprocessos
  console.log("\n--- ETAPA 4: cadastrando subprocessos (recursos) ---");
  let subCadastrados = 0;

  for (const s of SUBPROCESSOS) {
    const paiId = processoIdByNumero.get(s.processoPaiNumero);
    if (!paiId) {
      const erro = `Subprocesso ${s.processoPaiNumero}${s.sufixo}: processo pai nao encontrado`;
      console.error(`  [ERRO] ${erro}`);
      erros.push(erro);
      continue;
    }
    const numero = `${s.processoPaiNumero}${s.sufixo}`;
    const fase = faseDoEstagio(s.estagio).fase;
    // dataInterposicao: 1o de janeiro do ano informado como placeholder
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
      },
    });
    subCadastrados++;
    console.log(`  [ok] ${numero} | ${s.tipoRecurso} | ${s.relator} | ${fase}`);
  }

  // ---------- Resumo ----------
  console.log("\n========== RESUMO ==========");
  console.log(`Processos principais cadastrados: ${principaisCadastrados} / ${PROCESSOS.length}`);
  console.log(`Subprocessos cadastrados: ${subCadastrados} / ${SUBPROCESSOS.length}`);
  console.log(`Municipios criados: ${municipiosCriados}`);
  if (erros.length > 0) {
    console.log(`\nErros (${erros.length}):`);
    erros.forEach((e) => console.log(`  - ${e}`));
  } else {
    console.log("\nSem erros.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
