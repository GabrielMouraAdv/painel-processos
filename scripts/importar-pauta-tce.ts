/**
 * Sobe a pauta semanal do TCE-PE para a Pauta do painel.
 * Entrada: JSON gerado do .docx da pauta (uma sessao por tabela do documento).
 *
 * - Sessao: reaproveita a da mesma camara no mesmo dia (presencial ou virtual); se
 *   nao houver, cria. Data gravada ao meio-dia UTC. A sessao virtual (que corre a
 *   semana toda) fica no primeiro dia, com o periodo nas observacoes gerais.
 * - Item: pula se o mesmo numero ja esta na sessao; vincula ao processo do painel
 *   quando o numero existe. Objeto vai em "Observacoes internas".
 * - Nao muda fase, nao gera prazo nem andamento (igual a tela da Pauta).
 *
 * Uso:
 *   npx tsx scripts/importar-pauta-tce.ts <pauta.json>                       (simulacao)
 *   npx tsx scripts/importar-pauta-tce.ts <pauta.json> --gravar <desfazer.json>
 *   npx tsx scripts/importar-pauta-tce.ts --desfazer <desfazer.json>
 */
import { PrismaClient, type CamaraTce } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

type ItemEntrada = {
  numeroProcesso: string;
  tituloProcesso: string | null;
  objeto: string | null;
  relator: string;
  municipio: string;
  exercicio: string | null;
  advogadoResp: string;
  situacao: string | null;
  providencia: string | null;
};
type SessaoEntrada = {
  titulo: string;
  camara: CamaraTce;
  data: string; // aaaa-mm-dd
  virtual: boolean;
  periodo: string | null;
  itens: ItemEntrada[];
};
type Desfazer = { sessoesCriadas: string[]; itensCriados: string[] };

const VIRTUAL = "Sessão virtual";

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) {
    const d: Desfazer = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8"));
    await prisma.itemPauta.deleteMany({ where: { id: { in: d.itensCriados } } });
    await prisma.sessaoPauta.deleteMany({ where: { id: { in: d.sessoesCriadas }, itens: { none: {} } } });
    console.log(`desfeito: ${d.itensCriados.length} itens, ${d.sessoesCriadas.length} sessoes`);
    return;
  }

  const entrada = process.argv[2];
  const iGravar = process.argv.indexOf("--gravar");
  const gravar = iGravar > -1;
  const { sessoes } = JSON.parse(readFileSync(entrada, "utf-8")) as { sessoes: SessaoEntrada[] };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: GABRIEL_ID }, select: { escritorioId: true } });
  const escritorioId = user.escritorioId;
  const desfazer: Desfazer = { sessoesCriadas: [], itensCriados: [] };
  let semVinculo = 0;

  for (const s of sessoes) {
    if (s.itens.length === 0) {
      console.log(`\n${s.titulo}: sem processos, sessao nao criada`);
      continue;
    }
    const inicio = new Date(`${s.data}T00:00:00.000Z`);
    const fim = new Date(`${s.data}T23:59:59.999Z`);
    const candidatas = await prisma.sessaoPauta.findMany({
      where: { escritorioId, camara: s.camara, data: { gte: inicio, lte: fim } },
      select: { id: true, observacoesGerais: true, itens: { select: { numeroProcesso: true } } },
    });
    const existente = candidatas.find((c) => (c.observacoesGerais ?? "").startsWith(VIRTUAL) === s.virtual);
    const obs = s.virtual ? `${VIRTUAL} de ${s.periodo}.` : null;
    console.log(`\n${s.titulo}${s.virtual ? " (virtual)" : ""}: ${existente ? "sessao ja existe" : "CRIAR sessao"}`);

    let sessaoId = existente?.id ?? "";
    if (!existente && gravar) {
      const c = await prisma.sessaoPauta.create({
        data: { data: new Date(`${s.data}T12:00:00.000Z`), camara: s.camara, observacoesGerais: obs, escritorioId },
        select: { id: true },
      });
      sessaoId = c.id;
      desfazer.sessoesCriadas.push(c.id);
    }
    const jaNaSessao = new Set((existente?.itens ?? []).map((i) => i.numeroProcesso));

    for (const [ordem, i] of s.itens.entries()) {
      if (jaNaSessao.has(i.numeroProcesso)) {
        console.log(`  PULAR ${i.numeroProcesso}: ja esta na sessao`);
        continue;
      }
      const proc = await prisma.processoTce.findFirst({
        where: { escritorioId, numero: i.numeroProcesso },
        select: { id: true },
      });
      if (!proc) semVinculo++;
      console.log(`  ITEM ${i.numeroProcesso.padEnd(16)} ${proc ? "vinculado ao painel" : "SEM processo no painel"} | ${i.municipio} | ${i.advogadoResp}`);
      if (!gravar) continue;
      const item = await prisma.itemPauta.create({
        data: {
          sessaoId,
          numeroProcesso: i.numeroProcesso,
          tituloProcesso: i.tituloProcesso,
          municipio: i.municipio,
          exercicio: i.exercicio,
          relator: i.relator,
          advogadoResp: i.advogadoResp,
          situacao: i.situacao,
          observacoes: i.objeto ? `Objeto: ${i.objeto}` : null,
          providencia: i.providencia,
          processoTceId: proc?.id ?? null,
          ordem,
        },
        select: { id: true },
      });
      desfazer.itensCriados.push(item.id);
    }
  }

  console.log(`\nprocessos sem cadastro no painel: ${semVinculo}`);
  if (!gravar) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(desfazer, null, 1), "utf-8");
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "IMPORTAR_PAUTA_TCE", entidade: "SessaoPauta",
      descricao: `Pauta TCE importada do documento semanal: ${desfazer.sessoesCriadas.length} sessoes e ${desfazer.itensCriados.length} itens.`,
      detalhes: JSON.stringify(desfazer),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
