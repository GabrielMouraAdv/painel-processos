/**
 * Limpa publicacoes DJEN com conteudo raw "tipo_de_*" remanescente.
 *
 * Causa: o cron diario rodou em uma versao do codigo onde extrairComplementos
 * priorizava `descricao` (rotulo do campo) sobre `nome` (valor). Apos o fix,
 * a unique constraint (processoId, dataPublicacao, conteudo) permitiu que
 * existissem duas publicacoes para o mesmo evento: uma com conteudo correto
 * ("Mandado") e outra com conteudo raw ("tipo_de_documento").
 *
 * Estrategia:
 *   1. Para cada publicacao com "tipo_de_" no conteudo:
 *      a. Se existe outra publicacao do mesmo processo e mesma data SEM
 *         "tipo_de_", deleta a ruim (a boa fica).
 *      b. Caso contrario, atualiza usando o algoritmo corrigido.
 */
import { prisma } from "../lib/prisma";
import { consultarProcesso } from "../lib/datajud";

async function main() {
  const ruins = await prisma.publicacaoDJEN.findMany({
    where: { conteudo: { contains: "tipo_de_" } },
    select: {
      id: true,
      dataPublicacao: true,
      conteudo: true,
      processoId: true,
      processo: { select: { numero: true, tribunal: true } },
    },
  });
  console.log(`encontradas ${ruins.length} publicacoes com conteudo raw`);

  let deletadas = 0;
  let atualizadas = 0;
  let semDatajud = 0;

  for (const r of ruins) {
    // Existe outra publicacao do mesmo processo + data SEM "tipo_de_"?
    const irma = await prisma.publicacaoDJEN.findFirst({
      where: {
        processoId: r.processoId,
        dataPublicacao: r.dataPublicacao,
        NOT: { conteudo: { contains: "tipo_de_" } },
      },
      select: { id: true },
    });

    if (irma) {
      // Existe versao boa — deleta a ruim.
      await prisma.publicacaoDJEN.delete({ where: { id: r.id } });
      deletadas++;
      continue;
    }

    // Sem versao boa — tenta atualizar consultando o Datajud.
    const datajud = await consultarProcesso(
      r.processo.numero,
      r.processo.tribunal,
    );
    if (!datajud) {
      semDatajud++;
      continue;
    }
    const iso = r.dataPublicacao.toISOString();
    const mov = datajud.movimentos.find(
      (m) => new Date(m.dataHora).toISOString() === iso,
    );
    if (!mov) {
      semDatajud++;
      continue;
    }
    const novoConteudo = [mov.nome, ...mov.complementos]
      .filter(Boolean)
      .join(" | ");
    if (novoConteudo === r.conteudo) continue;
    try {
      await prisma.publicacaoDJEN.update({
        where: { id: r.id },
        data: { conteudo: novoConteudo },
      });
      atualizadas++;
    } catch (err) {
      console.warn(`erro ao atualizar ${r.id}: ${(err as Error).message}`);
    }
  }

  console.log(`deletadas (duplicatas): ${deletadas}`);
  console.log(`atualizadas: ${atualizadas}`);
  console.log(`sem match no datajud: ${semDatajud}`);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
