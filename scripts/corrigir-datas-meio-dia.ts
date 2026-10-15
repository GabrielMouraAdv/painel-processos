/**
 * Move datas "so de dia" gravadas a 00:00 UTC para 12:00 UTC (mesmo dia).
 * Corrige a exibicao com um dia a menos no navegador (UTC-3). Ver lib/datas.ts.
 *
 * Uso:
 *   npx tsx scripts/corrigir-datas-meio-dia.ts                       (simulacao)
 *   npx tsx scripts/corrigir-datas-meio-dia.ts --gravar <desfazer.json>
 *   npx tsx scripts/corrigir-datas-meio-dia.ts --desfazer <desfazer.json>
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

// tabela, coluna e rotulo
const ALVOS = [
  { tabela: "AndamentoTce", coluna: "data", rotulo: "Andamentos TCE" },
  { tabela: "ProcessoTce", coluna: "dataJulgamento", rotulo: "Julgamentos TCE" },
  { tabela: "Processo", coluna: "dataJulgamento", rotulo: "Julgamentos judiciais" },
] as const;

type Desfazer = Record<string, string[]>;

async function idsMeiaNoite(tabela: string, coluna: string): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `select id from "${tabela}" where "${coluna}" is not null and "${coluna}" = date_trunc('day', "${coluna}")`,
  );
  return rows.map((r) => r.id);
}

async function deslocar(tabela: string, coluna: string, ids: string[], horas: number) {
  for (let i = 0; i < ids.length; i += 500) {
    const lote = ids.slice(i, i + 500);
    await prisma.$executeRawUnsafe(
      `update "${tabela}" set "${coluna}" = "${coluna}" + interval '${horas} hours' where id = any($1::text[])`,
      lote,
    );
  }
}

async function main() {
  const iGravar = process.argv.indexOf("--gravar");
  const iDesfazer = process.argv.indexOf("--desfazer");

  if (iDesfazer > -1) {
    const arq = process.argv[iDesfazer + 1];
    const d: Desfazer = JSON.parse(readFileSync(arq, "utf-8"));
    for (const a of ALVOS) {
      const ids = d[`${a.tabela}.${a.coluna}`] ?? [];
      await deslocar(a.tabela, a.coluna, ids, -12);
      console.log(`desfeito ${a.rotulo}: ${ids.length}`);
    }
    return;
  }

  const desfazer: Desfazer = {};
  for (const a of ALVOS) {
    const total = await prisma.$queryRawUnsafe<{ n: number }[]>(
      `select count(*)::int n from "${a.tabela}" where "${a.coluna}" is not null`,
    );
    const ids = await idsMeiaNoite(a.tabela, a.coluna);
    desfazer[`${a.tabela}.${a.coluna}`] = ids;
    console.log(`${a.rotulo}: ${ids.length} de ${total[0].n} estao a 00:00 UTC`);
  }

  if (iGravar === -1) {
    console.log("SIMULACAO: nada foi gravado.");
    return;
  }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(desfazer), "utf-8");
  for (const a of ALVOS) {
    await deslocar(a.tabela, a.coluna, desfazer[`${a.tabela}.${a.coluna}`], 12);
  }
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID,
      acao: "CORRIGIR_DATAS_MEIO_DIA",
      entidade: "AndamentoTce/ProcessoTce/Processo",
      descricao: "Datas so de dia movidas de 00:00 UTC para 12:00 UTC (mesmo dia), para nao aparecerem com um dia a menos.",
      detalhes: JSON.stringify(Object.fromEntries(Object.entries(desfazer).map(([k, v]) => [k, v.length]))),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
