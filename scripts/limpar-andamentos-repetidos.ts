/**
 * Remove andamentos TCE repetidos: mesmo processo, mesmo dia, mesma fase e
 * MESMO texto (comparado sem diferenca de espacos e maiusculas). Fica o mais antigo.
 * Grupos com textos diferentes so sao listados (decisao manual).
 *
 * Uso:
 *   npx tsx scripts/limpar-andamentos-repetidos.ts                        (simulacao)
 *   npx tsx scripts/limpar-andamentos-repetidos.ts --gravar <desfazer.json>
 *   npx tsx scripts/limpar-andamentos-repetidos.ts --desfazer <desfazer.json>
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

import { diaDe } from "../lib/datas";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

type Linha = {
  id: string; processoId: string; data: Date; fase: string; descricao: string;
  autorId: string; createdAt: Date; processo: { numero: string };
};

async function main() {
  const iGravar = process.argv.indexOf("--gravar");
  const iDesfazer = process.argv.indexOf("--desfazer");

  if (iDesfazer > -1) {
    const linhas = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8")) as Omit<Linha, "processo">[];
    for (const l of linhas) {
      await prisma.andamentoTce.create({ data: { ...l, data: new Date(l.data), createdAt: new Date(l.createdAt) } });
    }
    console.log(`restaurados: ${linhas.length}`);
    return;
  }

  const todos: Linha[] = await prisma.andamentoTce.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, processoId: true, data: true, fase: true, descricao: true, autorId: true, createdAt: true, processo: { select: { numero: true } } },
  });
  const grupos = new Map<string, Linha[]>();
  for (const a of todos) {
    const k = `${a.processoId}|${diaDe(a.data)}|${a.fase}`;
    grupos.set(k, [...(grupos.get(k) ?? []), a]);
  }

  const apagar: Linha[] = [];
  const manuais: string[] = [];
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    const porTexto = new Map<string, Linha[]>();
    for (const a of g) porTexto.set(norm(a.descricao), [...(porTexto.get(norm(a.descricao)) ?? []), a]);
    for (const iguais of porTexto.values()) {
      if (iguais.length > 1) {
        apagar.push(...iguais.slice(1));
        console.log(`APAGAR ${iguais.length - 1}x  ${g[0].processo.numero}  ${diaDe(g[0].data)}  ${g[0].fase}  "${iguais[0].descricao.slice(0, 70)}"`);
      }
    }
    if (porTexto.size > 1) {
      manuais.push(`${g[0].processo.numero}  ${diaDe(g[0].data)}  ${g[0].fase}:\n` + [...porTexto.values()].map((v) => `    - ${v[0].descricao.slice(0, 160)}`).join("\n"));
    }
  }
  console.log(`\nTotal a apagar (texto identico): ${apagar.length}`);
  console.log(`Grupos com textos diferentes (decisao manual): ${manuais.length}\n${manuais.join("\n")}`);

  if (iGravar === -1) { console.log("\nSIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(apagar.map(({ processo: _p, ...l }) => l), null, 1), "utf-8");
  await prisma.andamentoTce.deleteMany({ where: { id: { in: apagar.map((a) => a.id) } } });
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "LIMPAR_ANDAMENTOS_REPETIDOS", entidade: "AndamentoTce",
      descricao: `Removidos ${apagar.length} andamentos TCE repetidos (mesmo processo, dia, fase e texto); mantido o mais antigo de cada grupo.`,
      detalhes: JSON.stringify(apagar.map((a) => ({ id: a.id, numero: a.processo.numero, fase: a.fase }))),
    },
  });
  console.log(`\nGRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
