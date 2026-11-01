/**
 * Resolve as pendências do relatório da rotina semanal TCE de 31/10/2026, aprovadas pelo
 * Gabriel em 01/11/2026. Dados conferidos na consulta pública do TCE-PE e no banco de
 * julgados (historico_do_processo).
 *
 *  A. cria recursos/processos que existem no portal e faltavam no painel (e vincula);
 *  B. marca julgamento e desfecho de recursos já decididos;
 *  C. corrige registros errados (tipo/órgão de recursos, andamento repetido, datas com
 *     um dia a menos por fuso, fase atual de processo julgado);
 *  D. encerra (fase "arquivado") cautelares com decisão terminativa/referendo sem recurso,
 *     que voltavam para a fila toda semana.
 *
 * Uso:
 *   npx tsx scripts/resolver-pendencias-rotina-2026-10-31.ts                      (simulação)
 *   npx tsx scripts/resolver-pendencias-rotina-2026-10-31.ts --gravar <desfazer.json>
 *   npx tsx scripts/resolver-pendencias-rotina-2026-10-31.ts --desfazer <desfazer.json>
 */
import { readFileSync, writeFileSync } from "fs";
import { PrismaClient, type CamaraTce, type Prisma, type ResultadoRecursoTce, type TipoProcessoTce, type TipoRecursoTce } from "@prisma/client";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";
const dia = (s: string) => new Date(`${s}T12:00:00.000Z`);
const PR = "porto-rodrigues", FC = "filipe-campos", PM = "paulo-maciel";

type Novo = {
  numero: string; tipo: TipoProcessoTce; camara: CamaraTce; relator: string | null; orgao: string; exercicio: string | null;
  bancas: string[]; faseAtual: string; objeto: string;
  recurso?: { tipo: TipoRecursoTce; origem: string };
  extra?: Partial<Prisma.ProcessoTceUncheckedCreateInput>;
};
// A ordem importa: o processo principal antes dos recursos dele.
const NOVOS: Novo[] = [
  { numero: "25101276-1", tipo: "AUDITORIA_ESPECIAL", camara: "SEGUNDA", relator: "Luiz Arcoverde", orgao: "Cachoeirinha", exercicio: "2024", bancas: [FC],
    faseAtual: "julgado_recorrido",
    objeto: "Admissão de Pessoal (concurso), Prefeitura de Cachoeirinha, exercício 2024 (cadastrada como auditoria especial, convenção do painel). Acórdão da 2ª Câmara de 07/10/2026, publicado em 08/10/2026; resultado a lançar. Parecer do MPCO em 02/09/2026. Cadastrado a partir da consulta pública do TCE-PE em 01/11/2026.",
    extra: { julgado: true, dataJulgamento: dia("2026-10-07"), parecerMpco: true } },
  { numero: "25101276-1ED001", tipo: "AUDITORIA_ESPECIAL", camara: "SEGUNDA", relator: "Luiz Arcoverde", orgao: "Cachoeirinha", exercicio: "2026", bancas: [FC],
    faseAtual: "em_julgamento", recurso: { tipo: "EMBARGOS_DECLARACAO", origem: "25101276-1" },
    objeto: "Embargos de Declaração opostos em 16/10/2026 contra o Acórdão publicado em 08/10/2026; em julgamento." },
  { numero: "19100226-4", tipo: "PRESTACAO_CONTAS_GESTAO", camara: "SEGUNDA", relator: "Adriano Cisneiros", orgao: "Agrestina", exercicio: "2018", bancas: [PR],
    faseAtual: "julgado_recorrido",
    objeto: "Prestação de Contas de Gestão de 2018 da Prefeitura de Agrestina, julgada irregular pela 2ª Câmara em 30/06/2025 (Rel. Adriano Cisneiros). Cadastrado em 01/11/2026 para vincular os recursos.",
    extra: { julgado: true, dataJulgamento: dia("2025-06-30"), resultadoJulgamento: "Contas Irregulares" } },
  { numero: "19100226-4ED001", tipo: "PRESTACAO_CONTAS_GESTAO", camara: "SEGUNDA", relator: "Adriano Cisneiros", orgao: "Agrestina", exercicio: "2025", bancas: [PR],
    faseAtual: "julgado", recurso: { tipo: "EMBARGOS_DECLARACAO", origem: "19100226-4" },
    objeto: "Embargos de Declaração contra o acórdão de 30/06/2025, improvidos pela 2ª Câmara em 13/10/2025.",
    extra: { julgado: true, dataJulgamento: dia("2025-10-13"), resultadoRecurso: "NAO_PROVIDO", orgaoJulgador: "SEGUNDA" } },
  { numero: "26100232-6ED001", tipo: "MEDIDA_CAUTELAR", camara: "PRIMEIRA", relator: "Ranilson Ramos", orgao: "Cabo de Santo Agostinho", exercicio: "2026", bancas: [PR],
    faseAtual: "em_julgamento", recurso: { tipo: "EMBARGOS_DECLARACAO", origem: "26100232-6" },
    objeto: "Embargos de Declaração opostos em 09/04/2026 contra o acórdão de referendo de 31/03/2026; em julgamento." },
  { numero: "24101338-0RO001", tipo: "AUDITORIA_ESPECIAL", camara: "PLENO", relator: null, orgao: "Brejo da Madre de Deus", exercicio: "2026", bancas: [PR, PM],
    faseAtual: "em_julgamento", recurso: { tipo: "RECURSO_ORDINARIO", origem: "24101338-0" },
    objeto: "Recurso Ordinário interposto em 14/07/2026 contra o acórdão da auditoria (irregular, 27/01/2026); em julgamento." },
  { numero: "24101338-0RO002", tipo: "AUDITORIA_ESPECIAL", camara: "PLENO", relator: null, orgao: "Brejo da Madre de Deus", exercicio: "2026", bancas: [PR, PM],
    faseAtual: "em_julgamento", recurso: { tipo: "RECURSO_ORDINARIO", origem: "24101338-0" },
    objeto: "Recurso Ordinário interposto em 14/07/2026 contra o acórdão da auditoria (irregular, 27/01/2026); em julgamento." },
];

// Recursos que já existiam no painel sem o processo de origem vinculado.
const VINCULAR: { numero: string; origem: string }[] = [
  { numero: "25101276-1ED002", origem: "25101276-1" },
  { numero: "19100226-4RO001", origem: "19100226-4" },
];

// B. Julgamento de recursos (data da sessão, conforme o banco de julgados do TCE-PE).
const JULGAR: { numero: string; data: string; desfecho: ResultadoRecursoTce | null; orgao: CamaraTce }[] = [
  { numero: "25100780-7ED001", data: "2026-03-17", desfecho: "NAO_PROVIDO", orgao: "PRIMEIRA" },
  { numero: "25100780-7RO001", data: "2026-08-03", desfecho: "NAO_PROVIDO", orgao: "PLENO" },
  { numero: "25101497-6RO001", data: "2026-05-18", desfecho: "NAO_PROVIDO", orgao: "PLENO" },
  { numero: "24101338-0ED001", data: "2026-05-26", desfecho: "PROVIDO_EM_PARTE", orgao: "PRIMEIRA" },
  { numero: "24101338-0ED002", data: "2026-05-26", desfecho: "NAO_PROVIDO", orgao: "PRIMEIRA" },
  { numero: "24100483-4RO001", data: "2026-09-16", desfecho: "NAO_PROVIDO", orgao: "PLENO" },
  { numero: "23100519-2RO001", data: "2026-05-25", desfecho: "NAO_PROVIDO", orgao: "PLENO" },
  { numero: "23100519-2ED001", data: "2025-12-15", desfecho: "NAO_PROVIDO", orgao: "SEGUNDA" },
  { numero: "25101435-6AR001", data: "2026-02-11", desfecho: "PROVIDO_EM_PARTE", orgao: "PLENO" },
  { numero: "25101435-6ED001", data: "2026-07-27", desfecho: "NAO_PROVIDO", orgao: "PLENO" },
  { numero: "25101317-0AR001", data: "2026-02-04", desfecho: "NAO_PROVIDO", orgao: "PLENO" },
  // O banco de julgados não traz o resultado; o andamento do principal diz "conhecidos e desprovidos".
  { numero: "25101317-0ED001", data: "2026-05-13", desfecho: "NAO_PROVIDO", orgao: "PLENO" },
  { numero: "24100673-9ED001", data: "2026-03-16", desfecho: "PROVIDO_EM_PARTE", orgao: "SEGUNDA" },
];

// C. Correções.
const TIPO_ORGAO_DA_ORIGEM = ["25100780-7ED001", "25100780-7RO001"]; // estavam como auditoria especial, sem órgão
const APAGAR_ANDAMENTO = [{ numero: "25101250-5", data: "2026-05-12", fase: "julgamento" }]; // repetido
const MOVER_ANDAMENTO = [{ numero: "25100260-3", de: "2026-02-19", para: "2025-02-19", fase: "manifestacao_apresentada" }];
// Datas de decisão com um dia a menos (fuso): data do julgamento e andamentos do mesmo dia.
const UM_DIA_A_MAIS = [
  { numero: "26100132-2", de: "2026-02-23", para: "2026-02-24" },
  { numero: "26100772-5", de: "2026-07-01", para: "2026-07-02" },
  { numero: "23100974-4", de: "2024-01-25", para: "2024-01-26" },
];
const FASE_ATUAL = [{ numero: "25100433-8", para: "julgado_recorrido" }]; // estava "em_instrucao" com julgamento e ED pendente

// D. Cautelares encerradas (decisão terminativa ou referendo, sem recurso pendente nem certidão de trânsito).
const ARQUIVAR = [
  "25101250-5", "26100132-2", "26100404-9", "25100080-1", "26100772-5", "23100857-0", "22101062-2", "22100635-7", "25101863-5",
  "23100974-4", "26101131-5", "26101120-0", "26100190-5", "25100735-2", "22100226-1", "25101404-6", "26100829-8", "25100260-3",
];

type Desfazer = {
  criados: string[];
  atualizados: { id: string; numero: string; antes: Record<string, unknown> }[];
  andamentosApagados: { processoId: string; data: string; fase: string; descricao: string; autorId: string }[];
  andamentosMovidos: { id: string; de: string }[];
};

const diaDe = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--desfazer") return desfazer(JSON.parse(readFileSync(args[1], "utf-8")));
  const gravar = args[0] === "--gravar";
  const arqDesfazer = gravar ? args[1] : null;
  if (gravar && !arqDesfazer) throw new Error("Informe o arquivo de desfazer depois de --gravar");

  const { escritorioId } = await prisma.user.findUniqueOrThrow({ where: { id: GABRIEL_ID }, select: { escritorioId: true } });
  const d: Desfazer = { criados: [], atualizados: [], andamentosApagados: [], andamentosMovidos: [] };
  const linhas: string[] = [];
  const log = (s: string) => { linhas.push(s); console.log(s); };
  const porNumero = async (numero: string) => prisma.processoTce.findFirst({ where: { escritorioId, numero } });
  const atualizar = async (id: string, numero: string, campos: Prisma.ProcessoTceUncheckedUpdateInput) => {
    const antes = await prisma.processoTce.findUniqueOrThrow({ where: { id } });
    const snap: Record<string, unknown> = {};
    for (const k of Object.keys(campos)) snap[k] = (antes as Record<string, unknown>)[k];
    d.atualizados.push({ id, numero, antes: snap });
    if (gravar) await prisma.processoTce.update({ where: { id }, data: campos });
  };

  log("== A. Criar processos/recursos que faltavam");
  const criadosAgora = new Map<string, string>();
  for (const n of NOVOS) {
    if (await porNumero(n.numero)) { log(`  PULAR ${n.numero}: já existe`); continue; }
    const org = await prisma.municipio.findFirst({ where: { escritorioId, nome: n.orgao }, select: { id: true } });
    if (!org) { log(`  ERRO ${n.numero}: órgão "${n.orgao}" não encontrado`); continue; }
    const origemId = n.recurso ? criadosAgora.get(n.recurso.origem) ?? (await porNumero(n.recurso.origem))?.id ?? null : null;
    if (n.recurso && !origemId && gravar) { log(`  ERRO ${n.numero}: origem ${n.recurso.origem} não existe`); continue; }
    log(`  CRIAR ${n.numero} ${n.tipo}${n.recurso ? ` / ${n.recurso.tipo} de ${n.recurso.origem}` : ""} | ${n.camara} | ${n.orgao} | fase ${n.faseAtual}`);
    if (!gravar) { criadosAgora.set(n.numero, "simulado"); continue; }
    const novo = await prisma.processoTce.create({
      data: {
        numero: n.numero, tipo: n.tipo, camara: n.camara, relator: n.relator, municipioId: org.id, exercicio: n.exercicio,
        bancasSlug: n.bancas, escritorioId, objeto: n.objeto, faseAtual: n.faseAtual,
        ...(n.recurso && { ehRecurso: true, tipoRecurso: n.recurso.tipo, processoOrigemId: origemId }),
        ...n.extra,
      },
      select: { id: true },
    });
    criadosAgora.set(n.numero, novo.id);
    d.criados.push(novo.id);
  }
  for (const v of VINCULAR) {
    const p = await porNumero(v.numero);
    const origemId = criadosAgora.get(v.origem) ?? (await porNumero(v.origem))?.id;
    if (!p || !origemId) { log(`  ERRO vincular ${v.numero} -> ${v.origem}`); continue; }
    if (p.processoOrigemId) { log(`  PULAR vincular ${v.numero}: já vinculado`); continue; }
    log(`  VINCULAR ${v.numero} -> ${v.origem}`);
    if (gravar) await atualizar(p.id, p.numero, { processoOrigemId: origemId, ehRecurso: true });
  }

  log("\n== B. Julgamento de recursos");
  for (const j of JULGAR) {
    const p = await porNumero(j.numero);
    if (!p) { log(`  ERRO ${j.numero}: não existe`); continue; }
    if (p.julgado && p.resultadoRecurso === j.desfecho && p.dataJulgamento && diaDe(p.dataJulgamento) === j.data) { log(`  PULAR ${j.numero}: já marcado`); continue; }
    log(`  JULGAR ${j.numero}: ${j.desfecho ?? "-"} em ${j.data} (${j.orgao})${p.dataJulgamento && diaDe(p.dataJulgamento) !== j.data ? ` [antes ${diaDe(p.dataJulgamento)}]` : ""}`);
    await atualizar(p.id, p.numero, { julgado: true, dataJulgamento: dia(j.data), resultadoRecurso: j.desfecho, orgaoJulgador: j.orgao, faseAtual: "julgado" });
  }

  log("\n== C. Correções");
  for (const n of TIPO_ORGAO_DA_ORIGEM) {
    const p = await porNumero(n);
    const o = p?.processoOrigemId ? await prisma.processoTce.findUnique({ where: { id: p.processoOrigemId } }) : null;
    if (!p || !o) { log(`  ERRO ${n}`); continue; }
    log(`  TIPO/ÓRGÃO ${n}: ${p.tipo} -> ${o.tipo}; órgão da origem; exercício ${o.exercicio}`);
    await atualizar(p.id, p.numero, { tipo: o.tipo, municipioId: o.municipioId, exercicio: p.exercicio ?? o.exercicio });
  }
  for (const a of APAGAR_ANDAMENTO) {
    const p = await porNumero(a.numero);
    const and = p && (await prisma.andamentoTce.findMany({ where: { processoId: p.id, fase: a.fase } })).filter((x) => diaDe(x.data) === a.data);
    if (!p || !and || and.length !== 1) { log(`  ERRO apagar andamento ${a.numero} ${a.data}: achou ${and?.length ?? 0}`); continue; }
    log(`  APAGAR andamento repetido ${a.numero} ${a.data} ${a.fase}`);
    d.andamentosApagados.push({ processoId: p.id, data: and[0].data.toISOString(), fase: and[0].fase, descricao: and[0].descricao, autorId: and[0].autorId });
    if (gravar) await prisma.andamentoTce.delete({ where: { id: and[0].id } });
  }
  for (const m of MOVER_ANDAMENTO) {
    const p = await porNumero(m.numero);
    const and = p && (await prisma.andamentoTce.findMany({ where: { processoId: p.id, fase: m.fase } })).filter((x) => diaDe(x.data) === m.de);
    if (!p || !and || and.length !== 1) { log(`  ERRO mover andamento ${m.numero}`); continue; }
    log(`  MOVER andamento ${m.numero} ${m.fase}: ${m.de} -> ${m.para}`);
    d.andamentosMovidos.push({ id: and[0].id, de: and[0].data.toISOString() });
    if (gravar) await prisma.andamentoTce.update({ where: { id: and[0].id }, data: { data: dia(m.para) } });
  }
  for (const u of UM_DIA_A_MAIS) {
    const p = await porNumero(u.numero);
    if (!p) { log(`  ERRO ${u.numero}`); continue; }
    if (p.dataJulgamento && diaDe(p.dataJulgamento) === u.de) {
      log(`  DATA ${u.numero}: julgamento ${u.de} -> ${u.para}`);
      await atualizar(p.id, p.numero, { dataJulgamento: dia(u.para) });
    }
    const ands = (await prisma.andamentoTce.findMany({ where: { processoId: p.id, fase: { in: ["julgamento", "decisao_monocratica", "decisao_referendo"] } } })).filter((x) => diaDe(x.data) === u.de);
    for (const a of ands) {
      log(`  DATA ${u.numero}: andamento ${a.fase} ${u.de} -> ${u.para}`);
      d.andamentosMovidos.push({ id: a.id, de: a.data.toISOString() });
      if (gravar) await prisma.andamentoTce.update({ where: { id: a.id }, data: { data: dia(u.para) } });
    }
  }
  for (const f of FASE_ATUAL) {
    const p = await porNumero(f.numero);
    if (!p) { log(`  ERRO ${f.numero}`); continue; }
    log(`  FASE ${f.numero}: ${p.faseAtual} -> ${f.para}`);
    await atualizar(p.id, p.numero, { faseAtual: f.para });
  }

  log("\n== D. Encerrar cautelares (fase arquivado)");
  for (const n of ARQUIVAR) {
    const p = await porNumero(n);
    if (!p) { log(`  ERRO ${n}: não existe`); continue; }
    if (p.tipo !== "MEDIDA_CAUTELAR") { log(`  ERRO ${n}: não é cautelar (${p.tipo})`); continue; }
    if (p.faseAtual === "arquivado") { log(`  PULAR ${n}: já arquivado`); continue; }
    const pend = await prisma.processoTce.count({ where: { processoOrigemId: p.id, julgado: false } });
    if (pend) { log(`  PULAR ${n}: tem ${pend} recurso(s) pendente(s)`); continue; }
    log(`  ARQUIVAR ${n} (fase ${p.faseAtual})`);
    await atualizar(p.id, p.numero, { faseAtual: "arquivado" });
  }

  if (!gravar) { console.log("\nSIMULAÇÃO: nada foi gravado."); return; }
  writeFileSync(arqDesfazer!, JSON.stringify(d, null, 1), "utf-8");
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "RESOLVER_PENDENCIAS_ROTINA_TCE", entidade: "ProcessoTce",
      descricao: `Pendências da rotina TCE de 31/10/2026: ${d.criados.length} criados, ${d.atualizados.length} atualizados, ${d.andamentosApagados.length} andamento(s) apagado(s), ${d.andamentosMovidos.length} movido(s).`,
      detalhes: JSON.stringify({ desfazer: arqDesfazer }),
    },
  });
  console.log(`\nGRAVADO. Desfazer: ${arqDesfazer}`);
}

async function desfazer(d: Desfazer) {
  for (const a of d.andamentosMovidos) await prisma.andamentoTce.update({ where: { id: a.id }, data: { data: new Date(a.de) } });
  for (const a of d.andamentosApagados) await prisma.andamentoTce.create({ data: { processoId: a.processoId, data: new Date(a.data), fase: a.fase, descricao: a.descricao, autorId: a.autorId } });
  for (const u of [...d.atualizados].reverse()) {
    const antes: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(u.antes)) antes[k] = typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : v;
    await prisma.processoTce.update({ where: { id: u.id }, data: antes as Prisma.ProcessoTceUncheckedUpdateInput });
  }
  for (const id of [...d.criados].reverse()) {
    await prisma.processoTce.updateMany({ where: { processoOrigemId: id }, data: { processoOrigemId: null } });
    await prisma.processoTce.delete({ where: { id } });
  }
  console.log("desfeito");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
