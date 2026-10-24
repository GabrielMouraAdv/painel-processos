/**
 * Atualiza o campo `objeto` de processos judiciais a partir de um JSON
 * { "objetos": { "<numero CNJ>": "<texto>" } }. Grava um arquivo de desfazer
 * com o texto anterior de cada processo.
 *
 * Uso (PowerShell, na pasta do repo):
 *   npx.cmd tsx scripts/atualizar-objeto-processos.ts --arquivo "C:\caminho\objetos.json"            (simula)
 *   npx.cmd tsx scripts/atualizar-objeto-processos.ts --arquivo "C:\caminho\objetos.json" --gravar "C:\caminho\desfazer.json"
 */
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const iArq = args.indexOf("--arquivo");
  const arquivo = iArq >= 0 ? args[iArq + 1] : null;
  const iGravar = args.indexOf("--gravar");
  const desfazer = iGravar >= 0 ? args[iGravar + 1] : null;
  if (!arquivo || !fs.existsSync(arquivo)) {
    console.error("Informe --arquivo <json>");
    process.exit(1);
  }
  const { objetos } = JSON.parse(fs.readFileSync(arquivo, "utf-8")) as { objetos: Record<string, string> };
  const anteriores: Record<string, string> = {};
  let atualizados = 0, iguais = 0, naoEncontrados = 0;
  for (const [numero, objeto] of Object.entries(objetos)) {
    const p = await prisma.processo.findUnique({ where: { numero }, select: { id: true, objeto: true } });
    if (!p) {
      naoEncontrados++;
      console.log(`  [nao encontrado] ${numero}`);
      continue;
    }
    if (p.objeto.trim() === objeto.trim()) {
      iguais++;
      continue;
    }
    anteriores[numero] = p.objeto;
    console.log(`  ${numero}\n     antes: ${p.objeto.replace(/\s+/g, " ").slice(0, 90)}\n     agora: ${objeto}`);
    if (desfazer) await prisma.processo.update({ where: { id: p.id }, data: { objeto } });
    atualizados++;
  }
  if (desfazer) {
    fs.writeFileSync(desfazer, JSON.stringify({ objetos: anteriores }, null, 2), "utf-8");
    console.log(`\nDesfazer salvo em ${desfazer}`);
  }
  console.log(`\n${desfazer ? "Atualizados" : "A atualizar"}: ${atualizados} · ja iguais: ${iguais} · nao encontrados: ${naoEncontrados}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
