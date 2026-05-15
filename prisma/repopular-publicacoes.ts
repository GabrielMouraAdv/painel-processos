/**
 * Repopula `PublicacaoDJEN.conteudo` e `MovimentacaoAutomatica.complementos`
 * usando o algoritmo corrigido de extracao de complementos do Datajud.
 *
 * Antes: o codigo priorizava `descricao` (rotulo do campo, ex.:
 * "tipo_de_documento") sobre `nome` (valor real, ex.: "Mandado"), e o conteudo
 * armazenado ficava generico para todas as publicacoes.
 *
 * Como rodar:
 *   npx tsx prisma/repopular-publicacoes.ts
 *   npx tsx prisma/repopular-publicacoes.ts --dry  (so mostra o que mudaria)
 */
import { prisma } from "../lib/prisma";
import { consultarProcesso } from "../lib/datajud";
import { detectaIntimacao } from "../lib/monitoramento-detect";

const dryRun = process.argv.includes("--dry");

function chave(data: Date, nome: string): string {
  return `${data.toISOString()}::${nome}`;
}

async function main() {
  const processos = await prisma.processo.findMany({
    select: { id: true, numero: true, tribunal: true },
  });
  console.log(`processos: ${processos.length}`);

  let pubsAtualizadas = 0;
  let movsAtualizadas = 0;
  let pubsNaoEncontradas = 0;
  let movsNaoEncontradas = 0;

  for (const proc of processos) {
    const resultado = await consultarProcesso(proc.numero, proc.tribunal);
    if (!resultado) {
      console.warn(`sem dados Datajud: ${proc.numero}`);
      continue;
    }

    // Indexa movimentos do Datajud por (dataHora, nome).
    const movDatajud = new Map<
      string,
      { nome: string; complementos: string[] }
    >();
    for (const mov of resultado.movimentos) {
      if (!mov.nome || !mov.dataHora) continue;
      const data = new Date(mov.dataHora);
      if (Number.isNaN(data.getTime())) continue;
      movDatajud.set(chave(data, mov.nome), {
        nome: mov.nome,
        complementos: mov.complementos,
      });
    }

    // Atualiza MovimentacaoAutomatica.
    const movs = await prisma.movimentacaoAutomatica.findMany({
      where: { processoId: proc.id },
      select: { id: true, dataMovimento: true, nomeMovimento: true },
    });
    for (const m of movs) {
      const k = chave(m.dataMovimento, m.nomeMovimento);
      const src = movDatajud.get(k);
      if (!src) {
        movsNaoEncontradas++;
        continue;
      }
      const novoComplemento = src.complementos.length
        ? src.complementos.join(" | ")
        : null;
      if (!dryRun) {
        await prisma.movimentacaoAutomatica.update({
          where: { id: m.id },
          data: { complementos: novoComplemento },
        });
      }
      movsAtualizadas++;
    }

    // Atualiza PublicacaoDJEN.
    const pubs = await prisma.publicacaoDJEN.findMany({
      where: { processoId: proc.id },
      select: { id: true, dataPublicacao: true, conteudo: true },
    });
    for (const p of pubs) {
      // Tenta achar o movimento Datajud cujo (dataHora) bate com dataPublicacao
      // independente do nome (o nome esta no inicio do conteudo atual).
      const isoData = p.dataPublicacao.toISOString();
      const candidato = Array.from(movDatajud.entries()).find(([k]) =>
        k.startsWith(`${isoData}::`),
      );
      if (!candidato) {
        pubsNaoEncontradas++;
        continue;
      }
      const [, src] = candidato;
      const novoConteudo = [src.nome, ...src.complementos]
        .filter(Boolean)
        .join(" | ");
      if (novoConteudo === p.conteudo) continue;

      // O `conteudo` faz parte da unique constraint (processoId, dataPublicacao,
      // conteudo). Como nao mudamos data nem processo, e como o novo valor e
      // mais especifico, nao deve haver colisao com outra linha do mesmo
      // processo. Mas se houver (rarissimo), capturamos e seguimos.
      if (!dryRun) {
        try {
          await prisma.publicacaoDJEN.update({
            where: { id: p.id },
            data: {
              conteudo: novoConteudo,
              geraIntimacao: detectaIntimacao(novoConteudo),
            },
          });
        } catch (err) {
          console.warn(`colisao em ${p.id}: ${(err as Error).message}`);
          continue;
        }
      }
      pubsAtualizadas++;
    }
  }

  console.log("---");
  console.log(`pubs atualizadas: ${pubsAtualizadas}`);
  console.log(`pubs sem match no Datajud: ${pubsNaoEncontradas}`);
  console.log(`movs atualizadas: ${movsAtualizadas}`);
  console.log(`movs sem match no Datajud: ${movsNaoEncontradas}`);
  console.log(dryRun ? "(dry-run)" : "OK");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
