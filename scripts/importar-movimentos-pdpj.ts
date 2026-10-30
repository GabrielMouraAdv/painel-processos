/**
 * Grava movimentos lidos no PJe pelo conector TecJustica (PDPJ/CNJ) como
 * MovimentacaoAutomatica com fonte "PDPJ". Serve para os processos prioritarios
 * quando o DataJud esta atrasado (ele atualiza em lotes, semanas depois do PJe).
 *
 * Entrada (JSON):
 *   { "0000065-32.2018.8.17.2130": [
 *       { "dataHora": "2026-10-21 08:02", "nome": "Petição",
 *         "descricao": "Juntada de Petição de manifestação do ministério público",
 *         "complementos": "tipo_de_peticao=manifestação do ministério público" } ] }
 *   - dataHora no horario de Recife (como o conector devolve).
 *   - complementos "chave=valor | chave=valor": grava so os valores, como o DataJud.
 *
 * Nao duplica: pula o movimento se o processo ja tem um com o mesmo nome no mesmo dia
 * (de qualquer fonte). Quando o DataJud alcancar, gravarMovimentacoesDatajud pula os
 * movimentos que ja vieram pelo PDPJ (mesmo dia e nome).
 *
 * Uso: npx tsx scripts/importar-movimentos-pdpj.ts <movimentos.json> [--gravar]
 */
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
type Mov = { dataHora: string; nome: string; descricao?: string | null; complementos?: string | null };

const fmtRecife = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit" });
const diaRecife = (d: Date) => fmtRecife.format(d);
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function dataUtc(dataHora: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(dataHora.trim());
  if (!m) return null;
  const [, a, me, d, h = "12", mi = "00", s = "00"] = m;
  // Recife = UTC-3
  return new Date(Date.UTC(+a, +me - 1, +d, +h + 3, +mi, +s));
}

function valores(complementos: string | null | undefined): string | null {
  if (!complementos) return null;
  const v = complementos
    .split("|")
    .map((p) => p.trim())
    .map((p) => (p.includes("=") ? p.slice(p.indexOf("=") + 1).trim() : p))
    .filter(Boolean);
  return v.length ? v.join(" | ") : null;
}

async function main() {
  const arq = process.argv[2];
  const gravar = process.argv.includes("--gravar");
  const dados = JSON.parse(fs.readFileSync(arq, "utf-8")) as Record<string, Mov[]>;
  let novos = 0, repetidos = 0, semProcesso = 0;
  for (const [numero, movs] of Object.entries(dados)) {
    const p = await prisma.processo.findUnique({ where: { numero }, select: { id: true } });
    if (!p) { semProcesso++; console.log(`  [sem processo] ${numero}`); continue; }
    const existentes = await prisma.movimentacaoAutomatica.findMany({ where: { processoId: p.id }, select: { dataMovimento: true, nomeMovimento: true } });
    const chaves = new Set(existentes.map((e) => `${diaRecife(e.dataMovimento)}|${norm(e.nomeMovimento)}`));
    const linhas = [];
    for (const m of movs) {
      const data = dataUtc(m.dataHora);
      if (!data || !m.nome) continue;
      const k = `${diaRecife(data)}|${norm(m.nome)}`;
      if (chaves.has(k)) { repetidos++; continue; }
      chaves.add(k);
      linhas.push({
        processoId: p.id, nomeMovimento: m.nome.trim(), descricao: m.descricao?.trim() || null,
        dataMovimento: data, complementos: valores(m.complementos), fonte: "PDPJ",
      });
    }
    if (linhas.length) console.log(`  ${numero}: +${linhas.length} (${linhas.map((l) => `${diaRecife(l.dataMovimento).slice(5)} ${l.nomeMovimento}`).join("; ")})`);
    if (gravar && linhas.length) await prisma.movimentacaoAutomatica.createMany({ data: linhas, skipDuplicates: true });
    novos += linhas.length;
  }
  console.log(`\n${gravar ? "Gravados" : "A gravar"}: ${novos} · ja existiam: ${repetidos} · sem processo: ${semProcesso}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
