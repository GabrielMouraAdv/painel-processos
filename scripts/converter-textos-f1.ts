/**
 * F1 (item 9): converte textos gravados sem acento para a forma oficial acentuada.
 *  1) ProcessoTce.resultadoJulgamento / resultadoFinal / penalidade -> rotulo oficial do tipo;
 *  2) Processo (judicial) resultadoJulgamento / penalidade -> rotulo oficial;
 *  3) Municipio.nome (orgaos e entidades) -> nomes com acento ("Betania" -> "Betânia").
 * O codigo ja compara sem acento, entao a conversao pode rodar a qualquer momento.
 *
 * Uso:
 *   npx tsx scripts/converter-textos-f1.ts                        (simulacao)
 *   npx tsx scripts/converter-textos-f1.ts --gravar <desfazer.json>
 *   npx tsx scripts/converter-textos-f1.ts --desfazer <desfazer.json>
 */
import { PrismaClient, type TipoProcesso, type TipoProcessoTce } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

import {
  PENALIDADES_JUD,
  PENALIDADES_TCE,
  RESULTADOS_POR_TIPO_JUD,
  RESULTADOS_POR_TIPO_TCE,
  rotuloCanonico,
} from "../lib/julgamento-config";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

// Palavras dos nomes de orgaos/entidades cadastrados (conferidas uma a uma).
const PALAVRAS: Record<string, string> = {
  Afranio: "Afrânio", Agencia: "Agência", Economico: "Econômico", Informacao: "Informação", Agua: "Água",
  Transito: "Trânsito", Urbanizacao: "Urbanização", Betania: "Betânia", Cabrobo: "Cabrobó", Camara: "Câmara",
  Consorcio: "Consórcio", Pajeu: "Pajeú", Regiao: "Região", Publico: "Público", Municipios: "Municípios",
  Fundacao: "Fundação", Previdencia: "Previdência", Previdenciario: "Previdenciário", Aracoiaba: "Araçoiaba",
  Oroco: "Orocó", Sao: "São", Jose: "José", Getulio: "Getúlio", Inaja: "Inajá", Itamaraca: "Itamaracá",
  Jaboatao: "Jaboatão", Jatauba: "Jataúba", Jatoba: "Jatobá", Quipapa: "Quipapá", Educacao: "Educação",
  Saude: "Saúde", Agrario: "Agrário", Solidao: "Solidão", Tamandare: "Tamandaré", Vitoria: "Vitória", Antao: "Antão",
};
const acentuarNome = (n: string) => n.replace(/[A-Za-z]+/g, (w) => PALAVRAS[w] ?? w);

type Mudanca = { tabela: "ProcessoTce" | "Processo" | "Municipio"; id: string; ref: string; campos: Record<string, { de: string | null; para: string }> };

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) {
    const d: Mudanca[] = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8"));
    for (const m of d) {
      const data = Object.fromEntries(Object.entries(m.campos).map(([k, v]) => [k, v.de]));
      if (m.tabela === "ProcessoTce") await prisma.processoTce.update({ where: { id: m.id }, data });
      else if (m.tabela === "Processo") await prisma.processo.update({ where: { id: m.id }, data });
      else await prisma.municipio.update({ where: { id: m.id }, data: data as { nome: string } });
    }
    console.log(`desfeito: ${d.length} registros`);
    return;
  }

  const mudancas: Mudanca[] = [];
  const naoReconhecidos: string[] = [];
  const conferir = (tabela: Mudanca["tabela"], id: string, ref: string, campo: string, atual: string | null, lista: string[], acc: Mudanca["campos"]) => {
    if (!atual) return;
    const oficial = rotuloCanonico(lista, atual);
    if (!oficial) { naoReconhecidos.push(`${tabela} ${ref} ${campo}: "${atual}"`); return; }
    if (oficial !== atual) acc[campo] = { de: atual, para: oficial };
  };

  for (const p of await prisma.processoTce.findMany({ select: { id: true, numero: true, tipo: true, resultadoJulgamento: true, resultadoFinal: true, penalidade: true } })) {
    const acc: Mudanca["campos"] = {};
    const lista = RESULTADOS_POR_TIPO_TCE[p.tipo as TipoProcessoTce];
    conferir("ProcessoTce", p.id, p.numero, "resultadoJulgamento", p.resultadoJulgamento, lista, acc);
    conferir("ProcessoTce", p.id, p.numero, "resultadoFinal", p.resultadoFinal, lista, acc);
    conferir("ProcessoTce", p.id, p.numero, "penalidade", p.penalidade, PENALIDADES_TCE, acc);
    if (Object.keys(acc).length) mudancas.push({ tabela: "ProcessoTce", id: p.id, ref: p.numero, campos: acc });
  }
  for (const p of await prisma.processo.findMany({ select: { id: true, numero: true, tipo: true, resultadoJulgamento: true, penalidade: true } })) {
    const acc: Mudanca["campos"] = {};
    conferir("Processo", p.id, p.numero, "resultadoJulgamento", p.resultadoJulgamento, RESULTADOS_POR_TIPO_JUD[p.tipo as TipoProcesso], acc);
    conferir("Processo", p.id, p.numero, "penalidade", p.penalidade, PENALIDADES_JUD, acc);
    if (Object.keys(acc).length) mudancas.push({ tabela: "Processo", id: p.id, ref: p.numero, campos: acc });
  }
  for (const m of await prisma.municipio.findMany({ select: { id: true, nome: true } })) {
    const novo = acentuarNome(m.nome);
    if (novo !== m.nome) mudancas.push({ tabela: "Municipio", id: m.id, ref: m.nome, campos: { nome: { de: m.nome, para: novo } } });
  }

  const cont: Record<string, number> = {};
  for (const m of mudancas) for (const c of Object.keys(m.campos)) cont[`${m.tabela}.${c}`] = (cont[`${m.tabela}.${c}`] ?? 0) + 1;
  console.log(JSON.stringify(cont));
  const exemplos = new Map<string, string>();
  for (const m of mudancas) for (const [c, v] of Object.entries(m.campos)) exemplos.set(`${c}: ${v.de}`, v.para);
  console.log([...exemplos.entries()].map(([k, v]) => `  ${k} -> ${v}`).join("\n"));
  if (naoReconhecidos.length) console.log(`NAO RECONHECIDOS (ficam como estao):\n  ${naoReconhecidos.join("\n  ")}`);

  const iGravar = process.argv.indexOf("--gravar");
  if (iGravar === -1) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(mudancas, null, 1), "utf-8");
  for (const m of mudancas) {
    const data = Object.fromEntries(Object.entries(m.campos).map(([k, v]) => [k, v.para]));
    if (m.tabela === "ProcessoTce") await prisma.processoTce.update({ where: { id: m.id }, data });
    else if (m.tabela === "Processo") await prisma.processo.update({ where: { id: m.id }, data });
    else await prisma.municipio.update({ where: { id: m.id }, data: data as { nome: string } });
  }
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "CONVERTER_TEXTOS_ACENTO", entidade: "ProcessoTce/Processo/Municipio",
      descricao: `Textos convertidos para a forma acentuada (resultados, penalidades e nomes de orgaos): ${mudancas.length} registros.`,
      detalhes: JSON.stringify(cont),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
