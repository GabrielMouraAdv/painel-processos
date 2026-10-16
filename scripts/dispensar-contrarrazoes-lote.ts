/**
 * Dispensa em lote das contrarrazoes a NT e ao MPCO ainda pendentes em processos TCE
 * julgados e nos recursos ja julgados (mesma regra do botao "Dispensar em cascata").
 *
 * Fica de fora a familia inteira (processo + recursos) quando ha recurso ainda nao julgado
 * ("julgado com recurso pendente: sem dispensa de contrarrazoes", como nas planilhas).
 * Motivo automatico: "<Processo|Recurso> ja julgado[ e transitado em julgado]; contrarrazoes desnecessarias."
 *
 * Uso:
 *   npx tsx scripts/dispensar-contrarrazoes-lote.ts <relatorio.json>                         (simulacao)
 *   npx tsx scripts/dispensar-contrarrazoes-lote.ts <relatorio.json> --gravar <desfazer.json>
 *   npx tsx scripts/dispensar-contrarrazoes-lote.ts --desfazer <desfazer.json>
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";
const ADVOGADO = "Gabriel Vidal de Moura";

type Item = { id: string; numero: string; ehRecurso: boolean; nt: boolean; mpco: boolean; motivo: string };

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) {
    const d: { itens: Item[]; andamentos: string[] } = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8"));
    await prisma.andamentoTce.deleteMany({ where: { id: { in: d.andamentos } } });
    for (const i of d.itens) {
      await prisma.processoTce.update({
        where: { id: i.id },
        data: {
          ...(i.nt && { contrarrazoesNtDispensadas: false, contrarrazoesNtDispensadoPor: null, contrarrazoesNtDispensadoEm: null, contrarrazoesNtDispensadoMotivo: null }),
          ...(i.mpco && { contrarrazoesMpcoDispensadas: false, contrarrazoesMpcoDispensadoPor: null, contrarrazoesMpcoDispensadoEm: null, contrarrazoesMpcoDispensadoMotivo: null }),
        },
      });
    }
    console.log(`desfeito: ${d.itens.length} processos, ${d.andamentos.length} andamentos removidos`);
    return;
  }

  const RELATORIO = process.argv[2];
  const iGravar = process.argv.indexOf("--gravar");
  const todos = await prisma.processoTce.findMany({
    select: {
      id: true, numero: true, ehRecurso: true, julgado: true, dataTransito: true, faseAtual: true, processoOrigemId: true,
      contrarrazoesNtApresentadas: true, contrarrazoesNtDispensadas: true,
      contrarrazoesMpcoApresentadas: true, contrarrazoesMpcoDispensadas: true,
      municipio: { select: { nome: true } },
    },
  });
  const porId = new Map(todos.map((p) => [p.id, p]));
  // raiz (processo principal) de cada registro
  const raizDe = (p: (typeof todos)[number]): string => {
    let atual = p;
    for (let i = 0; i < 10 && atual.processoOrigemId && porId.has(atual.processoOrigemId); i++) atual = porId.get(atual.processoOrigemId)!;
    return atual.id;
  };
  const familias = new Map<string, (typeof todos)[number][]>();
  for (const p of todos) familias.set(raizDe(p), [...(familias.get(raizDe(p)) ?? []), p]);

  // "Julgado" com fase de antes do julgamento e incoerente: fica fora para conferencia manual.
  const FASES_ANTES_DO_JULGAMENTO = new Set([
    "defesa_previa", "defesa_apresentada", "em_instrucao", "em_julgamento", "em_admissibilidade",
    "manifestacao_previa", "manifestacao_apresentada",
  ]);
  const itens: Item[] = [];
  const bloqueadas: { numero: string; pendentes: string[] }[] = [];
  const incoerentes: { numero: string; fase: string }[] = [];
  for (const [raizId, membros] of familias) {
    const raiz = porId.get(raizId)!;
    if (!raiz.julgado) continue;
    const recursosPendentes = membros.filter((m) => m.ehRecurso && !m.julgado);
    const candidatos = membros.filter((m) => m.julgado && (
      (!m.contrarrazoesNtApresentadas && !m.contrarrazoesNtDispensadas) ||
      (!m.contrarrazoesMpcoApresentadas && !m.contrarrazoesMpcoDispensadas)));
    if (!candidatos.length) continue;
    if (recursosPendentes.length) { bloqueadas.push({ numero: raiz.numero, pendentes: recursosPendentes.map((r) => r.numero) }); continue; }
    for (const m of candidatos) {
      if (FASES_ANTES_DO_JULGAMENTO.has(m.faseAtual)) { incoerentes.push({ numero: m.numero, fase: m.faseAtual }); continue; }
      const transitado = !!m.dataTransito || m.faseAtual === "transitado" || m.faseAtual === "transitado_cautelar";
      itens.push({
        id: m.id, numero: m.numero, ehRecurso: m.ehRecurso,
        nt: !m.contrarrazoesNtApresentadas && !m.contrarrazoesNtDispensadas,
        mpco: !m.contrarrazoesMpcoApresentadas && !m.contrarrazoesMpcoDispensadas,
        motivo: `${m.ehRecurso ? "Recurso" : "Processo"} ja julgado${transitado ? " e transitado em julgado" : ""}; contrarrazoes desnecessarias.`,
      });
    }
  }

  const resumo = {
    processosPrincipais: itens.filter((i) => !i.ehRecurso).length,
    recursos: itens.filter((i) => i.ehRecurso).length,
    dispensasNt: itens.filter((i) => i.nt).length,
    dispensasMpco: itens.filter((i) => i.mpco).length,
    familiasBloqueadasPorRecursoPendente: bloqueadas.length,
    foraPorFaseIncoerente: incoerentes.length,
  };
  console.log(JSON.stringify(resumo));
  writeFileSync(RELATORIO, JSON.stringify({ resumo, itens, bloqueadas, incoerentes }, null, 1), "utf-8");

  if (iGravar === -1) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  const agora = new Date();
  const hoje = agora.toLocaleDateString("pt-BR", { timeZone: "America/Recife" });
  const andamentos: string[] = [];
  const salva = () => writeFileSync(arq, JSON.stringify({ itens, andamentos }, null, 1), "utf-8");
  for (const i of itens) {
    const criados = await prisma.$transaction(async (tx) => {
      await tx.processoTce.update({
        where: { id: i.id },
        data: {
          ...(i.nt && { contrarrazoesNtDispensadas: true, contrarrazoesNtDispensadoPor: ADVOGADO, contrarrazoesNtDispensadoEm: agora, contrarrazoesNtDispensadoMotivo: i.motivo }),
          ...(i.mpco && { contrarrazoesMpcoDispensadas: true, contrarrazoesMpcoDispensadoPor: ADVOGADO, contrarrazoesMpcoDispensadoEm: agora, contrarrazoesMpcoDispensadoMotivo: i.motivo }),
        },
      });
      const ids: string[] = [];
      for (const ehNt of [true, false]) {
        if (ehNt ? !i.nt : !i.mpco) continue;
        const a = await tx.andamentoTce.create({
          data: {
            processoId: i.id, data: agora, autorId: GABRIEL_ID,
            fase: ehNt ? "contrarrazoes_nt_dispensadas" : "contrarrazoes_mpco_dispensadas",
            descricao: `${ehNt ? "Contrarrazoes a Nota Tecnica" : "Contrarrazoes ao Parecer MPCO"} dispensadas por ${ADVOGADO} em ${hoje} (dispensa em lote). Motivo: ${i.motivo}`,
          },
          select: { id: true },
        });
        ids.push(a.id);
      }
      return ids;
    });
    andamentos.push(...criados);
    salva();
  }
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "DISPENSAR_CONTRARRAZOES_LOTE", entidade: "ProcessoTce",
      descricao: `Dispensa em lote de contrarrazoes (NT ${resumo.dispensasNt}, MPCO ${resumo.dispensasMpco}) em ${itens.length} processos/recursos julgados.`,
      detalhes: JSON.stringify(resumo),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
