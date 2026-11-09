/**
 * Inclui agendamentos avulsos na aba "Agendamento de publicacoes" (providencias fora
 * da triagem LIG, ex.: memorial de processo em pauta). Saem na exportacao dos
 * pendentes de agendamento ate serem concluidos na aba.
 * Entrada: JSON [{ numeroProcesso, cliente, orgao, peca, prazo, dataAgenda (dd/mm/aaaa),
 *   prazoFatalTexto, observacoes, textoPublicacao }]
 *
 * Uso:
 *   npx tsx scripts/incluir-agendamento-avulso.ts <itens.json>            (simulacao)
 *   npx tsx scripts/incluir-agendamento-avulso.ts <itens.json> --gravar
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

type Item = {
  numeroProcesso: string; cliente: string; orgao: string; peca: string; prazo: string;
  dataAgenda: string; prazoFatalTexto: string; observacoes: string; textoPublicacao: string;
};

async function main() {
  const itens = JSON.parse(readFileSync(process.argv[2], "utf-8")) as Item[];
  const gravar = process.argv.includes("--gravar");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: GABRIEL_ID }, select: { nome: true } });
  for (const it of itens) {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(it.dataAgenda)) throw new Error(`dataAgenda invalida em ${it.numeroProcesso}`);
    const ja = await prisma.agendamentoAvulsoLig.findFirst({
      where: { numeroProcesso: it.numeroProcesso, peca: it.peca, dataAgenda: it.dataAgenda, concluidoEm: null },
    });
    if (ja) { console.log(`PULAR  ${it.numeroProcesso} · ${it.peca} (ja existe)`); continue; }
    console.log(`INCLUIR ${it.numeroProcesso} · ${it.peca} · agenda ${it.dataAgenda} · fatal ${it.prazoFatalTexto}`);
    if (gravar) await prisma.agendamentoAvulsoLig.create({ data: { ...it, usuarioId: GABRIEL_ID, usuarioNome: user.nome } });
  }
  console.log(gravar ? "GRAVADO." : "SIMULACAO: nada foi gravado.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
