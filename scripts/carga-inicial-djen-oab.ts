/**
 * Carga inicial das intimacoes do DJEN por OAB (lib/djen-oab.ts).
 *
 * Varre a API publica do DJEN pelas OABs monitoradas (lib/bancas.ts) nos
 * ultimos N dias (padrao 30), casa com os processos do painel e grava as
 * intimacoes em PublicacaoDJEN com fonte "DJEN_OAB". Comunicacoes de
 * processos que nao estao no painel sao apenas listadas.
 *
 * Uso:
 *   npx tsx scripts/carga-inicial-djen-oab.ts                 (simulacao, 30 dias)
 *   npx tsx scripts/carga-inicial-djen-oab.ts --dias 45       (simulacao, 45 dias)
 *   npx tsx scripts/carga-inicial-djen-oab.ts --gravar        (grava)
 *
 * Antes de --gravar, aplique a migracao 20261020120000_djen_oab_monitoramento
 * (npx prisma migrate deploy): a gravacao usa as colunas novas.
 */
import { writeFileSync } from "fs";

import { varrerDjenPorOab } from "../lib/djen-oab";
import { prisma } from "../lib/prisma";

const args = process.argv.slice(2);
const GRAVAR = args.includes("--gravar");
const idxDias = args.indexOf("--dias");
const DIAS =
  idxDias >= 0 && Number.isFinite(Number(args[idxDias + 1]))
    ? Math.max(1, Math.trunc(Number(args[idxDias + 1])))
    : 30;

function br(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

async function main() {
  console.log(
    GRAVAR
      ? `=== GRAVANDO intimacoes dos ultimos ${DIAS} dias ===\n`
      : `=== SIMULACAO (nada sera gravado) — ultimos ${DIAS} dias; passe --gravar para gravar ===\n`,
  );

  const r = await varrerDjenPorOab({ dias: DIAS, gravar: GRAVAR });

  console.log(`Janela: ${br(r.janela.inicio)} a ${br(r.janela.fim)}\n`);
  console.log("Por OAB:");
  for (const o of r.porOab) {
    console.log(
      `  ${o.sigla.padEnd(3)} OAB/${o.oab.replace(" ", " ")}  ${o.advogado.padEnd(30)} ${String(o.total).padStart(4)} comunicacoes  (${o.paginas} pag.)${o.erro ? "  ERRO: " + o.erro : ""}`,
    );
  }
  console.log(`\nComunicacoes distintas: ${r.comunicacoes}`);
  console.log(`Casaram com processos do painel: ${r.casaram}`);
  console.log(
    GRAVAR
      ? `Gravadas (novas): ${r.gravadas}  (as demais ja existiam)`
      : `Gravadas: 0 (simulacao)`,
  );
  if (r.interrompidoPorTempo) console.log("ATENCAO: interrompido por tempo — resultado parcial.");

  console.log(`\n--- Intimacoes de processos JA CADASTRADOS (${r.noPainel.length}) ---`);
  for (const i of r.noPainel) {
    console.log(
      `  ${br(i.data)}  ${i.numero}  ${i.tribunal.padEnd(5)} ${(i.tipoComunicacao || "-").padEnd(12)} ${i.geraIntimacao ? "[prazo?]" : "        "} ${i.resumo.slice(0, 110)}`,
    );
  }

  console.log(
    `\n--- Processos que NAO estao no painel (${r.naoCasaram.length}) — decidir se cadastra ---`,
  );
  for (const n of r.naoCasaram) {
    console.log(
      `  ${br(n.data)}  ${n.numero}  ${n.tribunal.padEnd(5)} ${n.classe.slice(0, 44).padEnd(44)} ${n.orgao.slice(0, 30).padEnd(30)} x${n.comunicacoes}  ${n.oabs.join(", ")}`,
    );
  }

  const saida = `carga-djen-oab-${r.janela.fim}${GRAVAR ? "" : "-simulacao"}.json`;
  writeFileSync(saida, JSON.stringify(r, null, 2), "utf-8");
  console.log(`\nRelatorio completo salvo em ${saida}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
