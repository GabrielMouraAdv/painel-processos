/**
 * Ajustes aprovados pelo Gabriel em 16/10/2026, antes da carga das planilhas REVISADAS
 * (Recife a Santa Maria da Boa Vista; Manari a Quipapa):
 *  1) cria 2 recursos que existem no e-TCEPE e faltavam no painel, vinculados ao pai;
 *  2) aplica nos 4 processos em conflito o resultado que a planilha revisada resolveu
 *     (o painel guardava "CONFERIR" nas observacoes).
 *
 * Uso:
 *   npx tsx scripts/ajustes-carga-revisada.ts                        (simulacao)
 *   npx tsx scripts/ajustes-carga-revisada.ts --gravar <desfazer.json>
 *   npx tsx scripts/ajustes-carga-revisada.ts --desfazer <desfazer.json>
 */
import { Prisma, PrismaClient, type ResultadoRecursoTce, type TipoRecursoTce } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

import { TCE_RECURSO_FASE_INICIAL } from "../lib/tce-config";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";
const dia = (s: string) => new Date(`${s}T12:00:00.000Z`);

type NovoRecurso = {
  numero: string;
  tipoRecurso: TipoRecursoTce;
  nome: string;
  dados: Partial<Prisma.ProcessoTceUncheckedCreateInput>;
};

const RECURSOS_NOVOS: NovoRecurso[] = [
  {
    numero: "20100311-9RO001",
    tipoRecurso: "RECURSO_ORDINARIO",
    nome: "Recurso Ordinario",
    // Pleno, 28/02/2024: provido em parte (Maria do Carmo Batista Barbosa).
    dados: {
      faseAtual: "julgado",
      julgado: true,
      dataJulgamento: dia("2024-02-28"),
      dataSessao: dia("2024-02-28"),
      orgaoJulgador: "PLENO",
      resultadoRecurso: "PROVIDO_EM_PARTE" as ResultadoRecursoTce,
      dataTransito: dia("2024-07-03"),
      observacoesJulgamento:
        "RO provido em parte: de contas irregulares para regulares com ressalvas; multa do art. 73, I de R$ 5.102,91 (Maria do Carmo Batista Barbosa).",
    },
  },
  {
    numero: "20100346-6RO002",
    tipoRecurso: "RECURSO_ORDINARIO",
    nome: "Recurso Ordinario",
    // Interposto em 23/04/2026 contra o novo acordao (05/03/2026); parecer do MPCO em 30/06/2026; sem acordao.
    dados: { parecerMpco: true },
  },
];

type Ajuste = { numero: string; motivo: string; dados: Prisma.ProcessoTceUpdateInput };

const AJUSTES: Ajuste[] = [
  {
    numero: "20100311-9",
    motivo: "multa final apos o RO001 (Maria do Carmo)",
    dados: {
      penalidade: "Multa",
      valorMulta: 5102.91,
      observacoesJulgamento:
        "Ac. 377/2023 (1ª Câmara) reformado pelos recursos: RO001 (Pleno, 28/02/2024) deu provimento parcial para julgar regulares com ressalvas as contas de Maria do Carmo Batista Barbosa, convertendo a multa do art. 73, III em multa do art. 73, I de R$ 5.102,91; RO002 (Pleno, 28/02/2024) deu provimento parcial para retirar a multa do art. 73, I de Lupércio. Resultado final: contas regulares com ressalvas, multa R$ 5.102,91 (Maria do Carmo). Trânsito 03/07/2024.",
    },
  },
  {
    numero: "20100346-6",
    motivo: "devolucao imputada a Brasluso; acordao rescindido, sem transito (RO002 pendente)",
    dados: {
      penalidade: "Devolução ao Erário",
      valorDevolucao: 25117.06,
      dataTransito: null,
      observacoesJulgamento:
        "Ac. 879/2024 (Pleno, 10/06/2024; multa R$ 5.171,54), mantido em RO001 (Ac. 1752/2024) e ED001, foi RESCINDIDO no PR001 (Pleno 24/09/2025, provido: cerceamento de defesa, defesa prévia da Brasluso não juntada). Novo Ac. (2ª Câmara, 05/03/2026): contas de Lupércio Carlos do Nascimento regulares com ressalvas, SEM multa; imputado débito de R$ 25.117,06 à Brasluso Turismo LTDA - EPP (não ao cliente); recomendação à Prefeitura de Olinda (art. 30, §3º, LC 014/2020). RO002 interposto em 23/04/2026, parecer do MPCO em 30/06/2026, sem acórdão; sem trânsito.",
    },
  },
  {
    numero: "21100061-9",
    motivo: "data da sessao (22/03/2022) e multa final apos o RO001",
    dados: {
      dataJulgamento: dia("2022-03-22"),
      valorMulta: 14692.8,
      observacoesJulgamento:
        "Ac. 314/2022 (1ª Câmara, 22/03/2022): regular com ressalvas; multas art. 73, I: Emilia Cardoso Gonzalez R$ 4.591,50, Juliana Helena Santos de Oliveira R$ 4.591,50, Luciana Lopes de Mello do Rego Barros R$ 5.509,80 e Renata Galdino Cabral R$ 4.591,50. RO001 (Pleno 12/12/2022) PROVIDO: excluída a multa de Renata Galdino Cabral. RO002 NÃO PROVIDO: mantida a multa. Valor final das multas mantidas: R$ 14.692,80. Trânsito 26/01/2023.",
    },
  },
  {
    numero: "23100951-3",
    motivo: "resultado inicial Irregular (Ac. 67/2026); desfecho apos recursos Regular com Ressalvas (ED001)",
    dados: {
      resultadoJulgamento: "Irregular",
      resultadoFinal: "Regular com Ressalvas",
      valorMulta: 17175.81,
      observacoesJulgamento:
        "Ac. 67/2026 (1ª Câmara): irregular, com multas (art. 73, III) a Carlos Sampaio de Alencar, Neilson Jones de Oliveira Alves e Roberto Ferreira Rocha. RO001 não provido (Ac. 1113/2026, Pleno); RO002/RO003/RO004 não conhecidos. ED001 (Pleno 19/08/2026) PROVIDO EM PARTE com efeito infringente: reformado o acórdão para JULGAR REGULAR COM RESSALVAS a auditoria especial, afastado o erro grosseiro e reduzidas as multas para R$ 5.725,27 cada (3 responsáveis; total R$ 17.175,81), reenquadradas no art. 73, I; mantidas determinações e recomendações. ED002/ED003 não conhecidos. Trânsito 11/09/2026.",
    },
  },
];

const CAMPOS = [
  "penalidade", "valorMulta", "valorDevolucao", "dataTransito", "dataJulgamento",
  "resultadoJulgamento", "resultadoFinal", "observacoesJulgamento",
] as const;

type Desfazer = {
  recursosCriados: { id: string; numero: string }[];
  ajustados: { id: string; numero: string; antes: Record<string, unknown> }[];
};

const mostrar = (v: unknown) =>
  v === null || v === undefined ? "-" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 60);

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) {
    const d: Desfazer = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8"));
    for (const a of d.ajustados) {
      const antes = Object.fromEntries(
        Object.entries(a.antes).map(([k, v]) => [k, typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : v]),
      );
      await prisma.processoTce.update({ where: { id: a.id }, data: antes });
    }
    for (const r of d.recursosCriados) {
      await prisma.andamentoTce.deleteMany({ where: { processoId: r.id } });
      await prisma.processoTce.delete({ where: { id: r.id } });
    }
    console.log(`desfeito: ${d.ajustados.length} processos, ${d.recursosCriados.length} recursos`);
    return;
  }

  const iGravar = process.argv.indexOf("--gravar");
  const gravar = iGravar > -1;
  const desfazer: Desfazer = { recursosCriados: [], ajustados: [] };

  for (const r of RECURSOS_NOVOS) {
    const numPai = r.numero.replace(/(RO|ED)\d{3}$/, "");
    if (await prisma.processoTce.findFirst({ where: { numero: r.numero }, select: { id: true } })) {
      console.log(`PULADO ${r.numero}: ja existe`);
      continue;
    }
    const pai = await prisma.processoTce.findFirst({
      where: { numero: numPai },
      select: { id: true, tipo: true, municipioId: true, relator: true, camara: true, exercicio: true, bancasSlug: true, escritorioId: true },
    });
    if (!pai) { console.log(`ERRO ${r.numero}: processo de origem ${numPai} nao existe`); continue; }
    console.log(`CRIAR ${r.numero} (${r.nome}) vinculado a ${numPai} | tipo ${pai.tipo} | ${r.dados.julgado ? `julgado, ${r.dados.resultadoRecurso}` : "pendente"}`);
    if (!gravar) continue;
    const c = await prisma.processoTce.create({
      data: {
        numero: r.numero, tipo: pai.tipo, municipioId: pai.municipioId, relator: pai.relator, camara: pai.camara,
        exercicio: pai.exercicio, bancasSlug: pai.bancasSlug, escritorioId: pai.escritorioId,
        faseAtual: TCE_RECURSO_FASE_INICIAL[r.tipoRecurso],
        objeto: `Recurso - ${r.nome}. Existente no e-TCEPE e ausente no painel; criado na carga revisada de 16/10/2026.`,
        ehRecurso: true, tipoRecurso: r.tipoRecurso, processoOrigemId: pai.id,
        ...r.dados,
      },
      select: { id: true },
    });
    desfazer.recursosCriados.push({ id: c.id, numero: r.numero });
  }

  for (const a of AJUSTES) {
    const p = await prisma.processoTce.findFirst({
      where: { numero: a.numero },
      select: { id: true, ...Object.fromEntries(CAMPOS.map((k) => [k, true])) },
    }) as ({ id: string } & Record<string, unknown>) | null;
    if (!p) { console.log(`ERRO ${a.numero}: nao existe`); continue; }
    const antes: Record<string, unknown> = {};
    console.log(`AJUSTAR ${a.numero}: ${a.motivo}`);
    for (const k of Object.keys(a.dados)) {
      antes[k] = p[k] instanceof Prisma.Decimal ? Number(p[k]) : p[k];
      if (k !== "observacoesJulgamento") console.log(`    ${k}: ${mostrar(antes[k])} -> ${mostrar((a.dados as Record<string, unknown>)[k])}`);
    }
    if (!gravar) continue;
    await prisma.processoTce.update({ where: { id: p.id }, data: a.dados });
    desfazer.ajustados.push({ id: p.id, numero: a.numero, antes });
  }

  if (!gravar) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(desfazer, null, 1), "utf-8");
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "AJUSTES_CARGA_TCE", entidade: "ProcessoTce",
      descricao: `Ajustes da carga revisada (16/10/2026): ${desfazer.recursosCriados.length} recursos criados e ${desfazer.ajustados.length} processos com o julgamento conferido.`,
      detalhes: JSON.stringify(desfazer),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
