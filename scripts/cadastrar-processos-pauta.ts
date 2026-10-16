/**
 * Cadastra no painel os processos da pauta de 19 a 23/10/2026 que ainda nao existiam
 * (pedido do Gabriel em 16/10/2026). Dados tirados do documento da pauta.
 *
 * - Fase "em_julgamento" (estao em pauta); nao gera prazo nem andamento.
 * - 25101086-7 (auditoria de origem dos embargos ED001/ED002) tambem e cadastrado,
 *   como julgado, para os embargos ficarem vinculados a ele.
 * - Cria o orgao "Secretaria de Saúde do Recife" se nao existir.
 * - Rodar ANTES do importar-pauta-tce.ts, para os itens da pauta ja nascerem vinculados.
 *
 * Uso:
 *   npx tsx scripts/cadastrar-processos-pauta.ts <pauta.json>                       (simulacao)
 *   npx tsx scripts/cadastrar-processos-pauta.ts <pauta.json> --gravar <desfazer.json>
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

const ORGAO_NOVO = "Secretaria de Saúde do Recife";
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
  { numero: "25100981-6", tipo: "AUDITORIA_ESPECIAL", camara: "PRIMEIRA", relator: "Dirceu Rodolfo Junior", orgao: "Venturosa", exercicio: "2025", bancas: [PR] },
  { numero: "24100563-2", tipo: "PRESTACAO_CONTAS_GOVERNO", camara: "PRIMEIRA", relator: "Luiz Arcoverde", orgao: "Altinho", exercicio: "2023", bancas: [FC, PR] },
  {
    numero: "2219115-0", tipo: "AUDITORIA_ESPECIAL", camara: "PLENO", relator: "Ricardo Rios", orgao: ORGAO_NOVO, exercicio: "2018", bancas: [FC],
    recurso: { tipo: "RECURSO_ORDINARIO" }, extra: { parecerMpco: true },
    objetoExtra: "Origem: Auditoria Especial nº 1822461-1 (não cadastrada no painel).",
  },
  { numero: "25101183-5", tipo: "CONSULTA", camara: "PLENO", relator: "Dirceu Rodolfo Junior", orgao: "Instituto Previdência Caruaru", exercicio: "2025", bancas: [PR] },
  { numero: "26101133-9", tipo: "MEDIDA_CAUTELAR", camara: "SEGUNDA", relator: "Eduardo Porto", orgao: "Ibimirim", exercicio: "2026", bancas: [FC] },
  {
    numero: "26101246-0", tipo: "MEDIDA_CAUTELAR", camara: "SEGUNDA", relator: "Eduardo Porto", orgao: "Ipojuca", exercicio: "2026", bancas: [FC],
    objetoExtra: "Incidental à Auditoria Especial nº 25100853-8 (não cadastrada no painel).",
  },
  { numero: "23100831-4", tipo: "AUTO_INFRACAO", camara: "PRIMEIRA", relator: "Ranilson Ramos", orgao: "Olinda", exercicio: "2023", bancas: [FC] },
  { numero: "25101032-6", tipo: "AUDITORIA_ESPECIAL", camara: "PRIMEIRA", relator: "Rodrigo Novaes", orgao: "Goiana", exercicio: "2025", bancas: [FC] },
];

const NOME_RECURSO: Record<string, string> = {
  EMBARGOS_DECLARACAO: "Embargos de Declaração",
  RECURSO_ORDINARIO: "Recurso Ordinário",
};

type ItemPautaJson = { numeroProcesso: string; objeto: string | null; situacao: string | null };
type Desfazer = { processosCriados: { id: string; numero: string }[]; orgaoCriado: string | null };

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) {
    const d: Desfazer = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8"));
    // Recursos antes da origem; solta os itens de pauta que tenham sido vinculados.
    for (const p of [...d.processosCriados].reverse()) {
      await prisma.itemPauta.updateMany({ where: { processoTceId: p.id }, data: { processoTceId: null } });
      await prisma.processoTce.delete({ where: { id: p.id } });
    }
    if (d.orgaoCriado) await prisma.municipio.delete({ where: { id: d.orgaoCriado } });
    console.log(`desfeito: ${d.processosCriados.length} processos${d.orgaoCriado ? " e 1 orgao" : ""}`);
    return;
  }

  const entrada = process.argv[2];
  const iGravar = process.argv.indexOf("--gravar");
  const gravar = iGravar > -1;
  const { sessoes } = JSON.parse(readFileSync(entrada, "utf-8")) as { sessoes: { itens: ItemPautaJson[] }[] };
  const doc = new Map(sessoes.flatMap((s) => s.itens).map((i) => [i.numeroProcesso, i]));
  const { escritorioId } = await prisma.user.findUniqueOrThrow({ where: { id: GABRIEL_ID }, select: { escritorioId: true } });
  const desfazer: Desfazer = { processosCriados: [], orgaoCriado: null };
  const criados = new Map<string, string>();

  // Orgao novo
  let orgaoNovoId = (await prisma.municipio.findFirst({ where: { escritorioId, nome: ORGAO_NOVO }, select: { id: true } }))?.id ?? null;
  if (!orgaoNovoId) {
    console.log(`CRIAR orgao "${ORGAO_NOVO}" (PE)`);
    if (gravar) {
      orgaoNovoId = (await prisma.municipio.create({ data: { nome: ORGAO_NOVO, uf: "PE", escritorioId }, select: { id: true } })).id;
      desfazer.orgaoCriado = orgaoNovoId;
    }
  }

  for (const c of CADASTROS) {
    if (await prisma.processoTce.findFirst({ where: { escritorioId, numero: c.numero }, select: { id: true } })) {
      console.log(`PULAR ${c.numero}: ja existe`);
      continue;
    }
    const orgao = c.orgao === ORGAO_NOVO ? { id: orgaoNovoId } : await prisma.municipio.findFirst({ where: { escritorioId, nome: c.orgao }, select: { id: true } });
    if (!orgao) { console.log(`ERRO ${c.numero}: orgao "${c.orgao}" nao encontrado`); continue; }
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
    const objeto = partes.join("\n\n") || "Cadastrado a partir da pauta de 19 a 23/10/2026.";
    console.log(
      `CRIAR ${c.numero.padEnd(16)} ${c.tipo}${c.recurso ? ` / ${c.recurso.tipo}${c.recurso.origem ? ` de ${c.recurso.origem}` : ""}` : ""} | ${c.camara} | ${c.relator} | ${c.orgao} | ${c.bancas.join("+")}${c.extra?.parecerMpco ? " | parecer MPCO" : ""}${c.extra?.julgado ? " | julgado" : ""}`,
    );
    if (!gravar) continue;
    const novo = await prisma.processoTce.create({
      data: {
        numero: c.numero, tipo: c.tipo, camara: c.camara, relator: c.relator, municipioId: orgao.id,
        exercicio: c.exercicio, bancasSlug: c.bancas, escritorioId, objeto,
        faseAtual: "em_julgamento",
        ...(c.recurso && { ehRecurso: true, tipoRecurso: c.recurso.tipo, processoOrigemId: origemId }),
        ...c.extra,
      },
      select: { id: true },
    });
    criados.set(c.numero, novo.id);
    desfazer.processosCriados.push({ id: novo.id, numero: c.numero });
  }

  if (!gravar) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(desfazer, null, 1), "utf-8");
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "CADASTRAR_PROCESSOS_PAUTA", entidade: "ProcessoTce",
      descricao: `Cadastro dos processos da pauta de 19 a 23/10/2026: ${desfazer.processosCriados.length} processos${desfazer.orgaoCriado ? " e 1 órgão" : ""}.`,
      detalhes: JSON.stringify(desfazer),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
