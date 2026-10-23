/**
 * Roda agora, fora do cron, a verificacao do Datajud para todos os processos
 * monitorados (a mesma rotina do cron: lib/monitoramento-verificar.ts).
 * Util depois de mudar a consulta (ex.: juntar as instancias) ou quando o cron
 * nao alcancou todos. Prioritarios primeiro, depois quem foi verificado ha mais tempo.
 *
 * Uso (PowerShell, na pasta do repo):
 *   npx.cmd tsx scripts/verificar-datajud-agora.ts            (todos os ativos)
 *   npx.cmd tsx scripts/verificar-datajud-agora.ts --so-prioritarios
 */
import { verificarProcessoMonitorado } from "../lib/monitoramento-verificar";
import { prisma } from "../lib/prisma";

async function main() {
  const soPrio = process.argv.includes("--so-prioritarios");
  const processos = await prisma.processo.findMany({
    where: { monitoramento: { monitoramentoAtivo: true }, ...(soPrio ? { prioritario: true } : {}) },
    select: { id: true, numero: true, prioritario: true },
    orderBy: [{ prioritario: "desc" }, { monitoramento: { ultimaVerificacao: { sort: "asc", nulls: "first" } } }],
  });
  console.log(`${processos.length} processos a verificar`);
  let movs = 0, pubs = 0, erros = 0, i = 0;
  let maisRecente: Date | null = null;
  const inicio = Date.now();
  for (const p of processos) {
    i++;
    const r = await verificarProcessoMonitorado(p.id);
    movs += r.novasMovimentacoes; pubs += r.novasPublicacoes;
    if (r.erro) erros++;
    if (r.datajudAtualizadoEm && (!maisRecente || r.datajudAtualizadoEm > maisRecente)) maisRecente = r.datajudAtualizadoEm;
    if (r.novasMovimentacoes > 0 || r.erro) console.log(`  ${p.prioritario ? "*" : " "} ${p.numero}: +${r.novasMovimentacoes} mov, +${r.novasPublicacoes} pub${r.erro ? ` | ERRO ${r.erro}` : ""}`);
    if (i % 25 === 0) console.log(`  ... ${i}/${processos.length} (${Math.round((Date.now() - inicio) / 1000)}s)`);
  }
  console.log(`\nverificados=${processos.length} novasMovimentacoes=${movs} novasPublicacoes=${pubs} erros=${erros} datajudMaisRecente=${maisRecente?.toISOString() ?? "-"} em ${Math.round((Date.now() - inicio) / 1000)}s`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
