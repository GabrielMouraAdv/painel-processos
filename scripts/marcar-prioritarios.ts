/**
 * Marca os processos prioritarios do escritorio (Processo.prioritario) a partir
 * da lista de referencia (JSON gerado da planilha "TABELA - IMPROBIDADES").
 *
 * - Processo ja cadastrado: so liga a marcacao (compara os 20 digitos do CNJ).
 * - Processo que nao existe no painel: cria com os dados minimos (tipo, tribunal
 *   derivado do numero, gestor pelo nome do cliente, advogado = o mais comum nos
 *   processos do mesmo gestor, senao o Gabriel), ativa o monitoramento e guarda o
 *   objeto e a ultima movimentacao da planilha no campo objeto. Data de
 *   distribuicao fica 01/01 do ano do CNJ, marcada "a confirmar" no objeto.
 * - Processo marcado antes e que saiu da lista perde a marcacao.
 *
 * Uso:
 *   npx tsx scripts/marcar-prioritarios.ts <prioritarios.json>                       (simulacao)
 *   npx tsx scripts/marcar-prioritarios.ts <prioritarios.json> --gravar <desfazer.json>
 *   npx tsx scripts/marcar-prioritarios.ts --desfazer <desfazer.json>
 */
import { PrismaClient, type Grau, type TipoProcesso, type Tribunal } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

import { tribunalPorNumeroCNJ } from "../lib/datajud";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

type ItemEntrada = {
  ordem: number;
  cliente: string;
  numero: string;
  objeto: string | null;
  situacao: string | null;
  naoHabilitado: boolean;
  observacao: string | null;
};
type Entrada = { situacaoEm: string; itens: ItemEntrada[] };
type Desfazer = { marcados: string[]; desmarcados: string[]; criados: string[] };

const digitos = (n: string) => n.replace(/\D+/g, "");
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

async function desfazer(arq: string) {
  const d = JSON.parse(readFileSync(arq, "utf-8")) as Desfazer;
  await prisma.processo.deleteMany({ where: { id: { in: d.criados } } });
  await prisma.processo.updateMany({ where: { id: { in: d.marcados } }, data: { prioritario: false } });
  await prisma.processo.updateMany({ where: { id: { in: d.desmarcados } }, data: { prioritario: true } });
  console.log(`Desfeito: ${d.criados.length} apagados, ${d.marcados.length} desmarcados, ${d.desmarcados.length} remarcados.`);
}

function tipoDe(it: ItemEntrada): TipoProcesso {
  const t = semAcento(`${it.objeto ?? ""} ${it.situacao ?? ""}`);
  if (/\bpena\b|detencao|reclusao|denuncia/.test(t)) return "CRIMINAL";
  return "IMPROBIDADE";
}

function tribunalDe(numero: string): { tribunal: Tribunal; grau: Grau } {
  const t = tribunalPorNumeroCNJ(numero);
  const origem = digitos(numero).slice(16, 20);
  const grau: Grau = origem === "0000" ? "SEGUNDO" : "PRIMEIRO";
  if (t === "TJPE" || t === "TRF5" || t === "TRF1" || t === "TRT6" || t === "STJ" || t === "STF") return { tribunal: t, grau };
  return { tribunal: "OUTRO", grau };
}

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) return desfazer(process.argv[iDesfazer + 1]);

  const arqEntrada = process.argv[2];
  if (!arqEntrada || arqEntrada.startsWith("--")) throw new Error("Informe o JSON da lista de prioritarios.");
  const entrada = JSON.parse(readFileSync(arqEntrada, "utf-8")) as Entrada;
  const iGravar = process.argv.indexOf("--gravar");
  const gravar = iGravar > -1;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: GABRIEL_ID }, select: { escritorioId: true } });
  const escritorioId = user.escritorioId;

  const [processos, gestores] = await Promise.all([
    prisma.processo.findMany({ where: { escritorioId }, select: { id: true, numero: true, prioritario: true, gestorId: true, advogadoId: true } }),
    prisma.gestor.findMany({ where: { escritorioId }, select: { id: true, nome: true } }),
  ]);
  const porDigitos = new Map(processos.map((p) => [digitos(p.numero), p]));

  // Gestor pelo nome do cliente: todas as palavras do nome da planilha (sem "de/da/do")
  // precisam aparecer no nome do painel, ou vice-versa ("Paulo Batista de Andrade" = "Paulo Batista Andrade").
  function gestorDe(cliente: string) {
    const palavras = (s: string) => semAcento(s).split(/\s+/).filter((w) => w.length > 2 && !["de", "da", "do", "dos", "das"].includes(w));
    const alvo = palavras(cliente);
    if (alvo.length < 2) return undefined;
    // Fica com o gestor que mais palavras tem em comum; nomes com menos de duas
    // palavras uteis (siglas, iniciais) nao contam.
    let melhor: { g: (typeof gestores)[number]; n: number } | null = null;
    for (const g of gestores) {
      const n = palavras(g.nome);
      if (n.length < 2) continue;
      const contido = alvo.every((w) => n.includes(w)) || n.every((w) => alvo.includes(w));
      if (!contido) continue;
      const comuns = n.filter((w) => alvo.includes(w)).length;
      if (!melhor || comuns > melhor.n) melhor = { g, n: comuns };
    }
    return melhor?.g;
  }
  function advogadoDe(gestorId: string): string {
    const cont = new Map<string, number>();
    for (const p of processos) if (p.gestorId === gestorId) cont.set(p.advogadoId, (cont.get(p.advogadoId) ?? 0) + 1);
    let melhor = GABRIEL_ID, n = 0;
    for (const [id, c] of cont) if (c > n) { melhor = id; n = c; }
    return melhor;
  }

  const desf: Desfazer = { marcados: [], desmarcados: [], criados: [] };
  const naLista = new Set<string>();
  const criar: { it: ItemEntrada; gestorId: string; advogadoId: string }[] = [];
  const jaMarcados: string[] = [];
  const aMarcar: string[] = [];
  const semGestor: string[] = [];

  for (const it of entrada.itens) {
    const d = digitos(it.numero);
    naLista.add(d);
    const p = porDigitos.get(d);
    if (p) {
      if (p.prioritario) jaMarcados.push(it.numero);
      else { aMarcar.push(it.numero); desf.marcados.push(p.id); }
      continue;
    }
    const g = gestorDe(it.cliente);
    if (!g) { semGestor.push(`${it.numero} (${it.cliente})`); continue; }
    criar.push({ it, gestorId: g.id, advogadoId: advogadoDe(g.id) });
  }
  const desmarcar = processos.filter((p) => p.prioritario && !naLista.has(digitos(p.numero)));

  console.log(`Lista: ${entrada.itens.length} processos`);
  console.log(`  ja marcados: ${jaMarcados.length} | a marcar: ${aMarcar.length} | a criar: ${criar.length} | perdem a marcacao: ${desmarcar.length}`);
  for (const n of aMarcar) console.log(`    marcar  ${n}`);
  for (const c of criar) {
    const { tribunal, grau } = tribunalDe(c.it.numero);
    const g = gestores.find((x) => x.id === c.gestorId)!;
    console.log(`    criar   ${c.it.numero} · ${tipoDe(c.it)} · ${tribunal} ${grau} · gestor "${g.nome}"${c.it.naoHabilitado ? " · NAO HABILITADO" : ""}`);
  }
  for (const p of desmarcar) console.log(`    desmarcar ${p.numero}`);
  if (semGestor.length) {
    console.log(`  SEM GESTOR NO PAINEL (nao criados, cadastre o gestor antes):`);
    for (const s of semGestor) console.log(`    - ${s}`);
  }

  if (!gravar) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");

  if (desf.marcados.length) await prisma.processo.updateMany({ where: { id: { in: desf.marcados } }, data: { prioritario: true } });
  for (const p of desmarcar) {
    await prisma.processo.update({ where: { id: p.id }, data: { prioritario: false } });
    desf.desmarcados.push(p.id);
  }
  for (const c of criar) {
    const { tribunal, grau } = tribunalDe(c.it.numero);
    const ano = digitos(c.it.numero).slice(9, 13);
    const objeto = [
      c.it.objeto,
      c.it.naoHabilitado ? "[Escritório ainda não habilitado nos autos]" : null,
      c.it.observacao ? `[${c.it.observacao}]` : null,
      c.it.situacao ? `Última movimentação (lista de ${entrada.situacaoEm.split("-").reverse().join("/")}): ${c.it.situacao}` : null,
      "[Data de distribuição a confirmar]",
    ].filter(Boolean).join("\n");
    const novo = await prisma.processo.create({
      data: {
        numero: c.it.numero, tipo: tipoDe(c.it), tribunal, juizo: "A confirmar", grau, fase: "Em andamento",
        risco: "MEDIO", dataDistribuicao: new Date(`${ano}-01-01T12:00:00.000Z`), objeto, prioritario: true,
        gestorId: c.gestorId, advogadoId: c.advogadoId, escritorioId,
        monitoramento: { create: { monitoramentoAtivo: true } },
      },
      select: { id: true },
    });
    desf.criados.push(novo.id);
  }
  writeFileSync(arq, JSON.stringify(desf, null, 1), "utf-8");
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "MARCAR_PRIORITARIOS", entidade: "Processo",
      descricao: `Lista de prioritários aplicada: ${desf.marcados.length} marcados, ${desf.criados.length} criados, ${desf.desmarcados.length} desmarcados.`,
      detalhes: JSON.stringify(desf),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
