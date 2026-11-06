/**
 * Comparacao: coletor do e-TCEPE x Painel (alimentado pela planilha do Cowork).
 * Periodo de teste: 07/11/2026 ate jan/2027.
 *
 * Uso:
 *   npx tsx scripts/comparar-coleta-etce.ts                       (desde 07/11/2026)
 *   npx tsx scripts/comparar-coleta-etce.ts 2026-11-14 2026-11-21  (janela)
 *
 * Gera docs/coletor-etce/comparacao-<data>.csv e imprime o resumo:
 *   A) NT / parecer MPCO que o e-TCEPE mostra e o Painel NAO marcou (todas as datas);
 *   B) novidades do coletor na janela x andamentos gravados no Painel na janela;
 *   C) processos que o coletor nao conseguiu ler.
 * Somente leitura.
 */
import { mkdirSync, writeFileSync } from "fs";

import { CATEGORIAS_MARCO } from "../lib/etce-coletor";
import { numeroBaseEtce } from "../lib/etce";
import { prisma } from "../lib/prisma";

const [ini, fim] = process.argv.slice(2);
const DESDE = new Date(`${ini ?? "2026-11-07"}T00:00:00-03:00`);
const ATE = fim ? new Date(`${fim}T23:59:59-03:00`) : new Date();
const csv: string[][] = [["secao", "processo", "fonte", "data", "categoria", "descricao"]];
const br = (d: Date | null) => (d ? d.toISOString().slice(0, 10).split("-").reverse().join("/") : "");

(async () => {
  const processos = await prisma.processoTce.findMany({
    where: { dataTransito: null, julgado: false },
    select: { id: true, numero: true, notaTecnica: true, parecerMpco: true },
  });
  const porBase = new Map<string, typeof processos>();
  for (const p of processos) {
    const b = numeroBaseEtce(p.numero);
    if (!b) continue;
    porBase.set(b, [...(porBase.get(b) ?? []), p]);
  }
  const bases = Array.from(porBase.keys());

  // ---------------------------------------------------------------- A) flags
  // Marcado no Painel = qualquer registro do mesmo numero-base (pai ou recurso).
  // Quando o que esta em andamento e so recurso (ED/RO...), so contam documentos
  // posteriores a autuacao do recurso: NT/parecer anteriores sao da fase de merito.
  const todosDaBase = await prisma.processoTce.findMany({
    where: { OR: bases.map((b) => ({ numero: { startsWith: b } })) },
    select: { numero: true, notaTecnica: true, parecerMpco: true, ehRecurso: true, dataAutuacao: true, julgado: true, dataTransito: true },
  });
  const ntMpco = await prisma.eventoEtce.findMany({
    where: { numeroBase: { in: bases }, categoria: { in: ["NOTA_TECNICA", "PARECER_MPCO", "COTA_MPCO"] } },
    orderBy: { data: "desc" },
  });
  console.log("\nA) e-TCEPE tem NT / parecer MPCO e o Painel NAO marcou");
  let divergencias = 0;
  const cotas: string[] = [];
  for (const b of bases) {
    const regs = todosDaBase.filter((p) => numeroBaseEtce(p.numero) === b);
    const ativos = regs.filter((p) => !p.julgado && !p.dataTransito);
    const soRecurso = ativos.length > 0 && ativos.every((p) => p.ehRecurso);
    const corte = soRecurso
      ? ativos.map((p) => p.dataAutuacao).filter((d): d is Date => !!d).sort((x, y) => x.getTime() - y.getTime())[0] ?? null
      : null;
    const valem = ntMpco.filter((e) => e.numeroBase === b && (!soRecurso || (corte && e.data && e.data >= corte)));
    const nt = valem.find((e) => e.categoria === "NOTA_TECNICA");
    const mp = valem.find((e) => e.categoria === "PARECER_MPCO");
    const cota = valem.find((e) => e.categoria === "COTA_MPCO");
    const marcadoNt = regs.some((p) => p.notaTecnica);
    const marcadoMp = regs.some((p) => p.parecerMpco);
    const faltas: string[] = [];
    if (nt && !marcadoNt) faltas.push(`NT de ${br(nt.data)}`);
    if (mp && !marcadoMp) faltas.push(`parecer MPCO de ${br(mp.data)}`);
    const sufixo = soRecurso ? (corte ? ` (recurso, desde ${br(corte)})` : " (recurso sem data de autuacao: nao comparado)") : "";
    if (faltas.length) {
      divergencias++;
      console.log(`   ${b}: ${faltas.join("; ")}${sufixo}`);
      csv.push(["A_flag", b, "e-TCEPE", "", "NT/MPCO", faltas.join("; ") + sufixo]);
    } else if (cota && !mp && !marcadoMp) {
      cotas.push(`${b} (cota de ${br(cota.data)})`);
      csv.push(["A_cota", b, "e-TCEPE", br(cota.data), "COTA_MPCO", cota.descricao]);
    }
  }
  if (!divergencias) console.log("   nenhuma");
  if (cotas.length) console.log(`   so com COTA do MPCO (ainda sem parecer): ${cotas.join(", ")}`);

  // ---------------------------------------------------------------- A2) julgado no e-TCEPE
  // Acordao/parecer previo/decisao nos ultimos 120 dias (ou apos a autuacao do
  // recurso em andamento) enquanto o Painel ainda mostra o processo em andamento.
  const recente = new Date(Date.now() - 120 * 86_400_000);
  const merito = await prisma.eventoEtce.findMany({
    where: { numeroBase: { in: bases }, tipo: "DELIBERACAO", categoria: "DELIBERACAO_MERITO", data: { gte: recente } },
    orderBy: { data: "desc" },
  });
  console.log("\nA2) Deliberacao de merito recente no e-TCEPE, Painel ainda 'em andamento'");
  let a2 = 0;
  for (const b of bases) {
    const regs = todosDaBase.filter((p) => numeroBaseEtce(p.numero) === b);
    const ativos = regs.filter((p) => !p.julgado && !p.dataTransito);
    const soRecurso = ativos.length > 0 && ativos.every((p) => p.ehRecurso);
    const corte = soRecurso
      ? ativos.map((p) => p.dataAutuacao).filter((d): d is Date => !!d).sort((x, y) => x.getTime() - y.getTime())[0] ?? null
      : null;
    const d = merito.find((e) => e.numeroBase === b && (!soRecurso || (corte && e.data && e.data > corte)));
    if (!d) continue;
    a2++;
    const quem = ativos.map((p) => p.numero).join(", ");
    console.log(`   ${b}: ${d.descricao} — em andamento no Painel: ${quem}`);
    csv.push(["A2_julgado", b, "e-TCEPE", br(d.data), d.categoria, `${d.descricao} | Painel: ${quem}`]);
  }
  if (!a2) console.log("   nenhuma");

  // ---------------------------------------------------------------- B) novidades x planilha
  const novos = await prisma.eventoEtce.findMany({
    where: { numeroBase: { in: bases }, linhaDeBase: false, detectadoEm: { gte: DESDE, lte: ATE } },
    orderBy: [{ numeroBase: "asc" }, { data: "asc" }],
  });
  const marcos = novos.filter((e) => CATEGORIAS_MARCO.has(e.categoria));
  const andamentos = await prisma.andamentoTce.findMany({
    where: { processoId: { in: processos.map((p) => p.id) }, createdAt: { gte: DESDE, lte: ATE } },
    select: { processoId: true, data: true, fase: true, descricao: true, createdAt: true },
    orderBy: { data: "asc" },
  });
  const baseDoId = new Map(processos.map((p) => [p.id, numeroBaseEtce(p.numero) as string]));

  console.log(`\nB) Janela ${br(DESDE)} a ${br(ATE)}: ${marcos.length} novidade(s) no coletor x ${andamentos.length} andamento(s) gravados no Painel`);
  const envolvidos = new Set([...marcos.map((e) => e.numeroBase), ...andamentos.map((a) => baseDoId.get(a.processoId) as string)]);
  let soColetor = 0;
  let soPlanilha = 0;
  for (const b of Array.from(envolvidos).sort()) {
    const ev = marcos.filter((e) => e.numeroBase === b);
    const an = andamentos.filter((a) => baseDoId.get(a.processoId) === b);
    const marca = ev.length && !an.length ? "  <- SO COLETOR" : !ev.length && an.length ? "  <- SO PLANILHA" : "";
    if (ev.length && !an.length) soColetor++;
    if (!ev.length && an.length) soPlanilha++;
    console.log(`   ${b}: coletor ${ev.length} / planilha ${an.length}${marca}`);
    for (const e of ev) {
      const ia = e.analiseIa as { resultado?: string; valorMulta?: number | null } | null;
      const extra = ia?.resultado ? ` [IA: ${ia.resultado}${ia.valorMulta ? `, multa R$ ${ia.valorMulta}` : ""}]` : "";
      console.log(`      coletor  ${br(e.data)} [${e.categoria}] ${e.descricao.slice(0, 110)}${extra}`);
      csv.push(["B_coletor", b, "e-TCEPE", br(e.data), e.categoria, e.descricao + extra]);
    }
    for (const a of an) {
      console.log(`      planilha ${br(a.data)} [${a.fase}] ${a.descricao.slice(0, 110)}`);
      csv.push(["B_planilha", b, "Painel", br(a.data), a.fase, a.descricao]);
    }
  }
  console.log(`   resumo: ${soColetor} processo(s) so no coletor, ${soPlanilha} so na planilha`);

  // ---------------------------------------------------------------- C) cobertura
  const coletas = await prisma.coletaEtce.findMany({ where: { numeroBase: { in: bases } } });
  const lidos = new Set(coletas.filter((c) => c.ok).map((c) => c.numeroBase));
  const semLeitura = bases.filter((b) => !lidos.has(b));
  const foraPadrao = processos.filter((p) => !numeroBaseEtce(p.numero)).map((p) => p.numero);
  console.log(`\nC) Cobertura: ${lidos.size}/${bases.length} processos lidos com sucesso`);
  for (const c of coletas.filter((c) => !c.ok)) console.log(`   falha ${c.numeroBase}: ${c.erro}`);
  if (semLeitura.length) console.log(`   ainda nao lidos: ${semLeitura.join(", ")}`);
  if (foraPadrao.length) console.log(`   fora do e-TCEPE (fisicos/antigos/PI), seguem so pela planilha: ${foraPadrao.join(", ")}`);

  mkdirSync("docs/coletor-etce", { recursive: true });
  const arq = `docs/coletor-etce/comparacao-${new Date().toISOString().slice(0, 10)}.csv`;
  writeFileSync(arq, "﻿" + csv.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n"), "utf8");
  console.log(`\nCSV: ${arq}`);
  await prisma.$disconnect();
})();
