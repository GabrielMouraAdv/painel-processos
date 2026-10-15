/**
 * Exclui andamentos TCE repetidos de texto diferente, conforme escolha do Gabriel
 * (15/10/2026): em cada grupo fica o registro mais completo.
 *
 * Uso:
 *   npx tsx scripts/excluir-andamentos-escolhidos.ts                        (simulacao)
 *   npx tsx scripts/excluir-andamentos-escolhidos.ts --gravar <desfazer.json>
 *   (desfazer: scripts/limpar-andamentos-repetidos.ts --desfazer <desfazer.json>)
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

import { diaDe } from "../lib/datas";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

// numero, dia, fase e o criterio do registro a EXCLUIR (o outro fica).
const ESCOLHAS: { numero: string; dia: string; fase: string; excluir: (descricao: string) => boolean }[] = [
  { numero: "25100223-8", dia: "2026-04-06", fase: "defesa_apresentada", excluir: (d) => d.trim() === "Defesa previa apresentada" },
  { numero: "24100794-0", dia: "2025-09-09", fase: "defesa_apresentada", excluir: (d) => d.trim() === "defesa apresentada" },
  { numero: "25101730-8", dia: "2026-03-27", fase: "defesa_apresentada", excluir: (d) => d.trim() === "Defesa apresentada" },
  { numero: "18100708-3", dia: "2020-01-17", fase: "embargos_1", excluir: (d) => d.includes("(18100708-3ED001)") },
  { numero: "18100708-3", dia: "2020-05-12", fase: "acordao_embargos_1", excluir: (d) => !d.startsWith("ED001:") },
  { numero: "17100198-9", dia: "2019-09-19", fase: "julgamento", excluir: (d) => !d.includes("Penalidade:") },
  // 17100248-9ED002: R$ 9.146,50 e a multa de um responsavel; o total (R$ 13.719,75) fica.
  { numero: "17100248-9ED002", dia: "2022-03-24", fase: "julgamento", excluir: (d) => d.includes("Multa R$ 9146.50") },
];

async function main() {
  const iGravar = process.argv.indexOf("--gravar");
  const apagar: { id: string; processoId: string; data: Date; fase: string; descricao: string; autorId: string; createdAt: Date }[] = [];

  for (const e of ESCOLHAS) {
    const doDia = (
      await prisma.andamentoTce.findMany({
        where: { fase: e.fase, processo: { numero: e.numero } },
        select: { id: true, processoId: true, data: true, fase: true, descricao: true, autorId: true, createdAt: true },
      })
    ).filter((a) => diaDe(a.data) === e.dia);
    const sai = doDia.filter((a) => e.excluir(a.descricao));
    const fica = doDia.filter((a) => !e.excluir(a.descricao));
    if (sai.length !== 1 || fica.length < 1) {
      console.log(`PULADO ${e.numero} ${e.dia} ${e.fase}: esperado 1 a excluir e 1+ a manter, achei ${sai.length}/${fica.length}`);
      continue;
    }
    apagar.push(sai[0]);
    console.log(`EXCLUIR ${e.numero} ${e.dia} ${e.fase}: "${sai[0].descricao.slice(0, 90)}"\n   fica: "${fica[0].descricao.slice(0, 90)}"`);
  }
  console.log(`\nTotal a excluir: ${apagar.length}`);

  if (iGravar === -1) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(apagar, null, 1), "utf-8");
  await prisma.andamentoTce.deleteMany({ where: { id: { in: apagar.map((a) => a.id) } } });
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "EXCLUIR_ANDAMENTOS_ESCOLHIDOS", entidade: "AndamentoTce",
      descricao: `Excluidos ${apagar.length} andamentos TCE repetidos de texto diferente (mantido o mais completo), por decisao do Gabriel.`,
      detalhes: JSON.stringify(apagar.map((a) => ({ id: a.id, fase: a.fase, descricao: a.descricao }))),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
