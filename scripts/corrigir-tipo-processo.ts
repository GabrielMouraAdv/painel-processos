/**
 * Corrige o tipo de processos TCE cadastrados com o tipo errado (ex.: Auto de Infracao
 * ou Contas de Governo gravados como Auditoria Especial). Use o numero do processo e
 * dos recursos, que herdam o tipo do pai.
 *
 * Uso:
 *   npx tsx scripts/corrigir-tipo-processo.ts <numeros separados por virgula> <TIPO>                       (simulacao)
 *   npx tsx scripts/corrigir-tipo-processo.ts <numeros> <TIPO> --gravar <desfazer.json>
 *   npx tsx scripts/corrigir-tipo-processo.ts --desfazer <desfazer.json>
 */
import { PrismaClient, TipoProcessoTce } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) {
    const d: { id: string; numero: string; tipoAntes: TipoProcessoTce }[] = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8"));
    for (const t of d) await prisma.processoTce.update({ where: { id: t.id }, data: { tipo: t.tipoAntes } });
    console.log(`desfeito: ${d.length}`);
    return;
  }

  const numeros = (process.argv[2] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const tipo = process.argv[3] as TipoProcessoTce;
  if (!Object.values(TipoProcessoTce).includes(tipo)) throw new Error(`Tipo invalido: ${tipo}. Validos: ${Object.values(TipoProcessoTce).join(", ")}`);
  const iGravar = process.argv.indexOf("--gravar");
  const alterados: { id: string; numero: string; tipoAntes: TipoProcessoTce }[] = [];

  for (const numero of numeros) {
    const p = await prisma.processoTce.findFirst({ where: { numero }, select: { id: true, tipo: true } });
    if (!p) { console.log(`ERRO ${numero}: nao existe`); continue; }
    if (p.tipo === tipo) { console.log(`PULADO ${numero}: ja e ${tipo}`); continue; }
    console.log(`TIPO ${numero}: ${p.tipo} -> ${tipo}`);
    if (iGravar === -1) continue;
    await prisma.processoTce.update({ where: { id: p.id }, data: { tipo } });
    alterados.push({ id: p.id, numero, tipoAntes: p.tipo });
  }

  if (iGravar === -1) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(alterados, null, 1), "utf-8");
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "CORRIGIR_TIPO_PROCESSO_TCE", entidade: "ProcessoTce",
      descricao: `Tipo corrigido para ${tipo}: ${alterados.map((a) => a.numero).join(", ")}.`,
      detalhes: JSON.stringify(alterados),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
