/**
 * Cadastra no painel os processos das pautas semanais do TCE-PE que ainda nao existiam
 * (19 a 23/10, 26 a 30/10 e 03 a 05/11/2026). Dados tirados do documento da pauta.
 *
 * - Fase "em_julgamento" (estao em pauta); nao gera prazo nem andamento.
 * - 25101086-7 (auditoria de origem dos embargos ED001/ED002) tambem e cadastrado,
 *   como julgado, para os embargos ficarem vinculados a ele.
 * - Cria os orgaos de ORGAOS_NOVOS que nao existirem.
 * - Os itens de pauta ja gravados com o mesmo numero e sem vinculo passam a apontar para o
 *   processo criado (o desfazer solta o vinculo de novo).
 * - Recurso cuja origem nao esta no painel (19100582-4, 2056058-8) fica sem processo de origem,
 *   com a origem descrita no objeto.
 *
 * Uso (um ou mais JSON de pauta, gerados por scripts/ler-pauta-docx.py):
 *   npx tsx scripts/cadastrar-processos-pauta.ts <pauta.json> [<pauta2.json>]                       (simulacao)
 *   npx tsx scripts/cadastrar-processos-pauta.ts <pauta.json> [<pauta2.json>] --gravar <desfazer.json>
 *   npx tsx scripts/cadastrar-processos-pauta.ts --desfazer <desfazer.json>
 */
import {
  PrismaClient,
  type CamaraTce,
  type Prisma,
  type TipoProcessoTce,
  type TipoRecursoTce,
} from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";
const dia = (s: string) => new Date(`${s}T12:00:00.000Z`);

type Cadastro = {
  numero: string;
  tipo: TipoProcessoTce;
  camara: CamaraTce;
  relator: string;
  orgao: string; // nome exato do Municipio/orgao no painel
  exercicio: string | null;
  bancas: string[];
  recurso?: { tipo: TipoRecursoTce; origem?: string };
  extra?: Partial<Prisma.ProcessoTceUncheckedCreateInput>;
  objetoExtra?: string;
};

// Orgaos criados se ainda nao existirem no painel.
const ORGAO_NOVO = "Secretaria de Saúde do Recife";
const ORGAOS_NOVOS = [ORGAO_NOVO, "Pombos"];
const PR = "porto-rodrigues";
const FC = "filipe-campos";

// A origem dos embargos vem primeiro, para os ED001/ED002 se vincularem a ela.
const CADASTROS: Cadastro[] = [
  {
    numero: "25101086-7", tipo: "AUDITORIA_ESPECIAL", camara: "PRIMEIRA", relator: "Rodrigo Novaes",
    orgao: "Cachoeirinha", exercicio: "2020 a 2022", bancas: [PR],
    extra: {
      faseAtual: "embargos_1", julgado: true, dataJulgamento: dia("2026-07-28"),
      resultadoJulgamento: "Irregular", penalidade: "Multa + Devolução ao Erário", valorDevolucao: 1311846.79,
      observacoesJulgamento:
        "Acórdão nº 1488/2026 (24ª Sessão Ordinária da 1ª Câmara, 28/07/2026): auditoria especial de conformidade julgada irregular; multa individual de R$ 11.442,54 às embargantes (Rosemary Ramos e Silva e Alexandra Carla Sobral Duarte) e ressarcimento de R$ 1.311.846,79 ao fundo municipal. Embargos ED001 e ED002 em pauta na 1ª Câmara em 20/10/2026.",
    },
    objetoExtra:
      "Auditoria Especial de Conformidade (exercícios 2020 a 2022). Cadastrada a partir da pauta de 19 a 23/10/2026, como origem dos embargos ED001 e ED002.",
  },
  { numero: "25101086-7ED001", tipo: "AUDITORIA_ESPECIAL", camara: "PRIMEIRA", relator: "Rodrigo Novaes", orgao: "Cachoeirinha", exercicio: "2020 a 2022", bancas: [PR], recurso: { tipo: "EMBARGOS_DECLARACAO", origem: "25101086-7" } },
  { numero: "25101086-7ED002", tipo: "AUDITORIA_ESPECIAL", camara: "PRIMEIRA", relator: "Rodrigo Novaes", orgao: "Cachoeirinha", exercicio: "2020 a 2022", bancas: [PR], recurso: { tipo: "EMBARGOS_DECLARACAO", origem: "25101086-7" } },
  { numero: "25100981-6", tipo: "AUDITORIA_ESPECIAL", camara: "PRIMEIRA", relator: "Dirceu Rodolfo", orgao: "Venturosa", exercicio: "2025", bancas: [PR] },
  { numero: "24100563-2", tipo: "PRESTACAO_CONTAS_GOVERNO", camara: "PRIMEIRA", relator: "Luiz Arcoverde", orgao: "Altinho", exercicio: "2023", bancas: [FC, PR] },
  {
    numero: "2219115-0", tipo: "AUDITORIA_ESPECIAL", camara: "PLENO", relator: "Ricardo Rios", orgao: ORGAO_NOVO, exercicio: "2018", bancas: [FC],
    recurso: { tipo: "RECURSO_ORDINARIO" }, extra: { parecerMpco: true },
    objetoExtra: "Origem: Auditoria Especial nº 1822461-1 (não cadastrada no painel).",
  },
  { numero: "25101183-5", tipo: "CONSULTA", camara: "PLENO", relator: "Dirceu Rodolfo", orgao: "Instituto Previdência Caruaru", exercicio: "2025", bancas: [PR] },
  { numero: "26101133-9", tipo: "MEDIDA_CAUTELAR", camara: "SEGUNDA", relator: "Eduardo Porto", orgao: "Ibimirim", exercicio: "2026", bancas: [FC] },
  {
    numero: "26101246-0", tipo: "MEDIDA_CAUTELAR", camara: "SEGUNDA", relator: "Eduardo Porto", orgao: "Ipojuca", exercicio: "2026", bancas: [FC],
    objetoExtra: "Incidental à Auditoria Especial nº 25100853-8 (não cadastrada no painel).",
  },
  { numero: "23100831-4", tipo: "AUTO_INFRACAO", camara: "PRIMEIRA", relator: "Ranilson Ramos", orgao: "Olinda", exercicio: "2023", bancas: [FC] },
  { numero: "25101032-6", tipo: "AUDITORIA_ESPECIAL", camara: "PRIMEIRA", relator: "Rodrigo Novaes", orgao: "Goiana", exercicio: "2025", bancas: [FC] },

  // ---- pauta de 26 a 30/10/2026
  {
    numero: "19100582-4ED001", tipo: "AUDITORIA_ESPECIAL", camara: "PLENO", relator: "Marcos Flavio",
    orgao: "Vitória de Santo Antão", exercicio: "2019", bancas: [PR],
    recurso: { tipo: "EMBARGOS_DECLARACAO" }, extra: { parecerMpco: true },
    objetoExtra:
      "Origem: Auditoria Especial de Conformidade nº 19100582-4 (Instituto de Previdência de Vitória de Santo Antão, plano financeiro, exercício 2019), julgada irregular pela 2ª Câmara em 14/04/2025 (não cadastrada no painel). Recursos ordinários RO001 a RO005 improvidos no Pleno.",
  },
  {
    numero: "2526421-7", tipo: "AUDITORIA_ESPECIAL", camara: "PLENO", relator: "Ruy Harten",
    orgao: "Canhotinho", exercicio: "2020", bancas: [PR],
    recurso: { tipo: "EMBARGOS_DECLARACAO" },
    objetoExtra:
      "Origem: Admissão de Pessoal nº 2056058-8 (contratação temporária, 1º quadrimestre de 2020), julgada ilegal pelo Acórdão T.C. nº 1955/2021 da 1ª Câmara (não cadastrada no painel). Já houve ED 2110028-7 e RO 2211599-7.",
  },
  { numero: "25100702-9", tipo: "PRESTACAO_CONTAS_GOVERNO", camara: "SEGUNDA", relator: "Marcos Loreto", orgao: "Venturosa", exercicio: "2024", bancas: [PR] },
  { numero: "25101813-1", tipo: "AUDITORIA_ESPECIAL", camara: "SEGUNDA", relator: "Marcos Loreto", orgao: "Brejo da Madre de Deus", exercicio: "2024/2025", bancas: [FC] },
  { numero: "25101096-0", tipo: "AUDITORIA_ESPECIAL", camara: "SEGUNDA", relator: "Valdecir Pascoal", orgao: "Instituto Previdência Olinda (olinprev)", exercicio: "2025", bancas: [FC] },
  { numero: "26101192-3", tipo: "MEDIDA_CAUTELAR", camara: "SEGUNDA", relator: "Valdecir Pascoal", orgao: "Arcoverde", exercicio: "2026", bancas: [PR] },

  // ---- pauta de 03 a 05/11/2026
  { numero: "26100277-6", tipo: "AUDITORIA_ESPECIAL", camara: "PRIMEIRA", relator: "Ranilson Ramos", orgao: "Pombos", exercicio: "2025", bancas: [FC] },
  { numero: "26101228-9", tipo: "MEDIDA_CAUTELAR", camara: "PRIMEIRA", relator: "Dirceu Rodolfo", orgao: "Caruaru", exercicio: "2026", bancas: [PR] },
  {
    numero: "19100226-4RO001", tipo: "PRESTACAO_CONTAS_GESTAO", camara: "PLENO", relator: "Ruy Harten",
    orgao: "Agrestina", exercicio: "2018", bancas: [PR],
    recurso: { tipo: "RECURSO_ORDINARIO" },
    objetoExtra:
      "Origem: Prestação de Contas de Gestão nº 19100226-4 (Agrestina, 2018), julgada irregular em 30/06/2025 (Rel. Adriano Cisneiros); embargos ED001 improvidos em 13/10/2025 (não cadastrada no painel).",
  },
  {
    numero: "24100673-9ED002", tipo: "AUDITORIA_ESPECIAL", camara: "PLENO", relator: "Marcos Loreto",
    orgao: "Ibimirim", exercicio: "2026", bancas: [FC],
    recurso: { tipo: "EMBARGOS_DECLARACAO", origem: "24100673-9" },
  },
  { numero: "25100716-9", tipo: "PRESTACAO_CONTAS_GOVERNO", camara: "SEGUNDA", relator: "Eduardo Porto", orgao: "Vitória de Santo Antão", exercicio: "2024", bancas: [PR] },
  {
    numero: "25101276-1ED002", tipo: "AUDITORIA_ESPECIAL", camara: "SEGUNDA", relator: "Luiz Arcoverde",
    orgao: "Cachoeirinha", exercicio: "2026", bancas: [FC],
    recurso: { tipo: "EMBARGOS_DECLARACAO" },
    objetoExtra:
      "Origem: processo 25101276-1, não cadastrado no painel e sem deliberação no banco de julgados; o tipo do processo de origem (registrado como auditoria especial) está A CONFIRMAR.",
  },
];

const NOME_RECURSO: Record<string, string> = {
  EMBARGOS_DECLARACAO: "Embargos de Declaração",
  RECURSO_ORDINARIO: "Recurso Ordinário",
};

type ItemPautaJson = { numeroProcesso: string; objeto: string | null; situacao: string | null };
type Desfazer = { processosCriados: { id: string; numero: string }[]; orgaoCriado: string | null; orgaosCriados?: string[] };

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) {
    const d: Desfazer = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8"));
    // Recursos antes da origem; solta os itens de pauta que tenham sido vinculados.
    for (const p of [...d.processosCriados].reverse()) {
      await prisma.itemPauta.updateMany({ where: { processoTceId: p.id }, data: { processoTceId: null } });
      await prisma.processoTce.delete({ where: { id: p.id } });
    }
    const orgaos = [...(d.orgaosCriados ?? []), ...(d.orgaoCriado ? [d.orgaoCriado] : [])];
    for (const id of orgaos) await prisma.municipio.delete({ where: { id } });
    console.log(`desfeito: ${d.processosCriados.length} processos e ${orgaos.length} orgao(s)`);
    return;
  }

  const iGravar = process.argv.indexOf("--gravar");
  const gravar = iGravar > -1;
  const entradas = process.argv.slice(2, iGravar > -1 ? iGravar : undefined).filter((a) => !a.startsWith("--"));
  const doc = new Map<string, ItemPautaJson>();
  for (const entrada of entradas) {
    const { sessoes } = JSON.parse(readFileSync(entrada, "utf-8")) as { sessoes: { itens: ItemPautaJson[] }[] };
    for (const i of sessoes.flatMap((x) => x.itens)) doc.set(i.numeroProcesso, i);
  }
  const { escritorioId } = await prisma.user.findUniqueOrThrow({ where: { id: GABRIEL_ID }, select: { escritorioId: true } });
  const desfazer: Desfazer = { processosCriados: [], orgaoCriado: null, orgaosCriados: [] };
  const criados = new Map<string, string>();

  // Orgaos novos (so os que algum cadastro pendente usa)
  const pendentes = new Set<string>();
  for (const c of CADASTROS) {
    if (!(await prisma.processoTce.findFirst({ where: { escritorioId, numero: c.numero }, select: { id: true } }))) pendentes.add(c.orgao);
  }
  const orgaosNovosIds = new Map<string, string | null>();
  for (const nome of ORGAOS_NOVOS) {
    let id = (await prisma.municipio.findFirst({ where: { escritorioId, nome }, select: { id: true } }))?.id ?? null;
    if (!id && pendentes.has(nome)) {
      console.log(`CRIAR orgao "${nome}" (PE)`);
      if (gravar) {
        id = (await prisma.municipio.create({ data: { nome, uf: "PE", escritorioId }, select: { id: true } })).id;
        desfazer.orgaosCriados!.push(id);
      }
    }
    orgaosNovosIds.set(nome, id);
  }

  for (const c of CADASTROS) {
    if (await prisma.processoTce.findFirst({ where: { escritorioId, numero: c.numero }, select: { id: true } })) {
      console.log(`PULAR ${c.numero}: ja existe`);
      continue;
    }
    const orgao = orgaosNovosIds.has(c.orgao)
      ? { id: orgaosNovosIds.get(c.orgao) ?? null }
      : await prisma.municipio.findFirst({ where: { escritorioId, nome: c.orgao }, select: { id: true } });
    if (!orgao || (gravar && !orgao.id)) { console.log(`ERRO ${c.numero}: orgao "${c.orgao}" nao encontrado`); continue; }
    let origemId: string | null = null;
    if (c.recurso?.origem) {
      origemId = criados.get(c.recurso.origem)
        ?? (await prisma.processoTce.findFirst({ where: { escritorioId, numero: c.recurso.origem }, select: { id: true } }))?.id
        ?? null;
      if (!origemId && gravar) { console.log(`ERRO ${c.numero}: origem ${c.recurso.origem} nao existe`); continue; }
    }
    const d = doc.get(c.numero);
    const partes = [
      c.recurso ? `${NOME_RECURSO[c.recurso.tipo]}.` : null,
      d?.objeto ?? null,
      c.objetoExtra ?? null,
      d?.situacao ? `Na pauta: ${d.situacao}` : null,
    ].filter(Boolean);
    const objeto = partes.join("\n\n") || "Cadastrado a partir da pauta semanal do TCE-PE.";
    console.log(
      `CRIAR ${c.numero.padEnd(16)} ${c.tipo}${c.recurso ? ` / ${c.recurso.tipo}${c.recurso.origem ? ` de ${c.recurso.origem}` : ""}` : ""} | ${c.camara} | ${c.relator} | ${c.orgao} | ${c.bancas.join("+")}${c.extra?.parecerMpco ? " | parecer MPCO" : ""}${c.extra?.julgado ? " | julgado" : ""}`,
    );
    if (!gravar) continue;
    const novo = await prisma.processoTce.create({
      data: {
        numero: c.numero, tipo: c.tipo, camara: c.camara, relator: c.relator, municipioId: orgao.id!,
        exercicio: c.exercicio, bancasSlug: c.bancas, escritorioId, objeto,
        faseAtual: "em_julgamento",
        ...(c.recurso && { ehRecurso: true, tipoRecurso: c.recurso.tipo, processoOrigemId: origemId }),
        ...c.extra,
      },
      select: { id: true },
    });
    criados.set(c.numero, novo.id);
    desfazer.processosCriados.push({ id: novo.id, numero: c.numero });
    const vinc = await prisma.itemPauta.updateMany({
      where: { numeroProcesso: c.numero, processoTceId: null, sessao: { escritorioId } },
      data: { processoTceId: novo.id },
    });
    if (vinc.count) console.log(`      ${vinc.count} item(ns) de pauta vinculado(s)`);
  }

  if (!gravar) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(desfazer, null, 1), "utf-8");
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "CADASTRAR_PROCESSOS_PAUTA", entidade: "ProcessoTce",
      descricao: `Cadastro dos processos das pautas do TCE-PE: ${desfazer.processosCriados.length} processos e ${desfazer.orgaosCriados!.length} órgão(s).`,
      detalhes: JSON.stringify(desfazer),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
