/**
 * Liga as marcas "Nota tecnica" e "Parecer MPCO" dos processos TCE ainda nao julgados
 * a partir dos andamentos ja gravados (regra em lib/tce-marcas-andamento.ts: parecer
 * da DEX/nota tecnica; parecer do MPCO; cota NAO conta; pedido de parecer NAO conta).
 * So liga marcas; nunca desliga.
 *
 * Uso:
 *   npx tsx scripts/marcar-nt-mpco-andamentos.ts                         (simulacao)
 *   npx tsx scripts/marcar-nt-mpco-andamentos.ts --gravar <desfazer.json>
 *   npx tsx scripts/marcar-nt-mpco-andamentos.ts --desfazer <desfazer.json>
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

import { camposMarcas } from "../lib/tce-marcas-andamento";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";
type Desfazer = { alterados: { id: string; numero: string; antes: { notaTecnica: boolean; parecerMpco: boolean } }[] };

async function main() {
  const iD = process.argv.indexOf("--desfazer");
  if (iD > -1) {
    const d = JSON.parse(readFileSync(process.argv[iD + 1], "utf-8")) as Desfazer;
    for (const a of d.alterados) await prisma.processoTce.update({ where: { id: a.id }, data: a.antes });
    console.log(`Desfeito: ${d.alterados.length} processos.`);
    return;
  }
  const iG = process.argv.indexOf("--gravar");
  const gravar = iG > -1;
  const arq = gravar ? process.argv[iG + 1] : null;
  if (gravar && !arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");

  const processos = await prisma.processoTce.findMany({
    where: { julgado: false, OR: [{ notaTecnica: false }, { parecerMpco: false }] },
    select: { id: true, numero: true, notaTecnica: true, parecerMpco: true, andamentos: { select: { descricao: true } } },
    orderBy: { numero: "asc" },
  });
  const desf: Desfazer = { alterados: [] };
  let nt = 0, mpco = 0;
  for (const p of processos) {
    const campos = camposMarcas(p, p.andamentos.map((a) => a.descricao));
    if (!Object.keys(campos).length) continue;
    if (campos.notaTecnica) nt++;
    if (campos.parecerMpco) mpco++;
    console.log(`${p.numero.padEnd(18)} ${campos.notaTecnica ? "+NT " : "    "}${campos.parecerMpco ? "+MPCO" : ""}`);
    desf.alterados.push({ id: p.id, numero: p.numero, antes: { notaTecnica: p.notaTecnica, parecerMpco: p.parecerMpco } });
    if (gravar) await prisma.processoTce.update({ where: { id: p.id }, data: campos });
  }
  console.log(`Processos: ${desf.alterados.length} | marcar nota tecnica: ${nt} | marcar parecer MPCO: ${mpco}`);
  if (!gravar) { console.log("SIMULACAO: nada foi gravado."); return; }
  writeFileSync(arq!, JSON.stringify(desf, null, 1), "utf-8");
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "MARCAR_NT_MPCO", entidade: "ProcessoTce",
      descricao: `Marcas de nota tecnica (${nt}) e parecer do MPCO (${mpco}) ligadas pelos andamentos em ${desf.alterados.length} processos.`,
      detalhes: JSON.stringify(desf),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
