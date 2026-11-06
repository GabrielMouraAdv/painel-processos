/**
 * Coletor do e-TCEPE rodado na mao (mesmo codigo do cron semanal).
 *
 * Uso:
 *   npx tsx scripts/coletar-etce.ts 26101133-9 22100815-9      (simulacao: so mostra)
 *   npx tsx scripts/coletar-etce.ts --todos                    (simulacao de todos em andamento)
 *   npx tsx scripts/coletar-etce.ts --todos --gravar           (grava ColetaEtce/EventoEtce)
 *   npx tsx scripts/coletar-etce.ts --todos --gravar --ia      (e le acordaos novos por IA)
 *
 * Nunca grava em AndamentoTce nem altera ProcessoTce (periodo de comparacao).
 */
import { CATEGORIAS_MARCO, rodadaColeta } from "../lib/etce-coletor";
import { analisarDeliberacoesPendentes } from "../lib/etce-ia";
import { prisma } from "../lib/prisma";

const args = process.argv.slice(2);
const GRAVAR = args.includes("--gravar");
const IA = args.includes("--ia");
const TODOS = args.includes("--todos");
const numeros = args.filter((a) => !a.startsWith("--"));

(async () => {
  if (!TODOS && numeros.length === 0) {
    console.log("Informe numeros (ex.: 26101133-9) ou --todos.");
    process.exit(2);
  }
  const t0 = Date.now();
  const r = await rodadaColeta({
    gravar: GRAVAR,
    deadline: Date.now() + 60 * 60_000,
    concorrencia: 3,
    alvos: TODOS ? undefined : numeros,
  });
  console.log(
    `\n${GRAVAR ? "GRAVADO" : "SIMULACAO"} — alvos ${r.alvos}, lidos ${r.lidos}, falhas ${r.falhas.length}` +
      `${r.foraDoAr ? " (e-TCEPE FORA DO AR, rodada interrompida)" : ""}, ${Math.round((Date.now() - t0) / 1000)}s`,
  );
  for (const res of r.resultados.sort((a, b) => a.numeroBase.localeCompare(b.numeroBase))) {
    const marcos = res.novos.filter((e) => CATEGORIAS_MARCO.has(e.categoria));
    const rotulo = res.primeiraLeitura ? "1a leitura (linha de base)" : `${marcos.length} novidade(s)`;
    console.log(`\n${res.numeroBase} — ${rotulo}; tarefas abertas: ${res.tarefasAbertas.join("; ") || "-"}`);
    const mostrar = res.primeiraLeitura
      ? marcos.filter((e) => /NOTA_TECNICA|PARECER_MPCO|PEDIDO_|DELIBERACAO_MERITO/.test(e.categoria)).slice(0, 6)
      : marcos;
    for (const e of mostrar) console.log(`   [${e.categoria}] ${e.data ?? "?"} ${e.descricao.slice(0, 140)}`);
  }
  for (const f of r.falhas) console.log(`FALHA ${f.numeroBase}: ${f.erro}`);

  if (IA && GRAVAR) {
    const ia = await analisarDeliberacoesPendentes({ gravar: true, deadline: Date.now() + 10 * 60_000, limite: 30 });
    console.log(`\nIA: ${ia.analisadas} analisada(s), ${ia.semTexto} sem inteiro teor ainda, ${ia.erros.length} erro(s)`);
  }
  await prisma.$disconnect();
})();
