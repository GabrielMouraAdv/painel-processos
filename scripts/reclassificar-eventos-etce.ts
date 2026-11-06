/**
 * Recalcula a categoria dos documentos ja guardados pelo coletor do e-TCEPE
 * quando a regra de lib/etce.ts muda (ex.: separar COTA_MPCO de PARECER_MPCO).
 * Uso: npx tsx scripts/reclassificar-eventos-etce.ts [--gravar]
 */
import { categoriaDocumento } from "../lib/etce";
import { prisma } from "../lib/prisma";

const GRAVAR = process.argv.includes("--gravar");

(async () => {
  const docs = await prisma.eventoEtce.findMany({
    where: { tipo: "DOCUMENTO" },
    select: { id: true, categoria: true, descricao: true },
  });
  const mudancas = new Map<string, string[]>();
  for (const d of docs) {
    const classificacao = d.descricao.split(": ")[0];
    const nova = categoriaDocumento(classificacao);
    if (nova !== d.categoria) mudancas.set(`${d.categoria} -> ${nova}`, [...(mudancas.get(`${d.categoria} -> ${nova}`) ?? []), d.id]);
  }
  for (const [k, ids] of Array.from(mudancas)) {
    console.log(`${k}: ${ids.length}`);
    if (GRAVAR) {
      const [, nova] = k.split(" -> ");
      await prisma.eventoEtce.updateMany({ where: { id: { in: ids } }, data: { categoria: nova } });
    }
  }
  console.log(GRAVAR ? "gravado" : "simulacao (use --gravar)");
  await prisma.$disconnect();
})();
