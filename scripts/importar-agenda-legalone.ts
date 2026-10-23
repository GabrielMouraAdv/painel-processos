/**
 * Importa a agenda do Legal One (Compromissos e tarefas) para a tabela Compromisso
 * do painel, para a faixa "Semana" do Inicio mostrar o que cada advogado tem.
 *
 * Nao ha API do Legal One: a leitura e feita pelo navegador do Claude (Gabriel loga),
 * que gera um JSON com os itens da semana. Este script grava esse JSON.
 *
 * Entrada (JSON, lista de itens):
 *   [{ "sigla": "GM", "dia": "2026-10-23", "hora": "14:00", "titulo": "Defesa Previa - 24100673-9RO001 - Ipojuca - PF! 23/10" }]
 *   - sigla: agenda exibida no Legal One (GM, HC, HA...)
 *   - dia: dia em que o item esta na agenda (aaaa-mm-dd)
 *   - hora: opcional ("HH:MM"); ausente = dia inteiro
 *   - titulo: texto do item
 *
 * Regras:
 *   - O prazo escrito no titulo ("PF 23/10", "Pf! 23/10", "Fatal Real: 23/10") manda: o compromisso
 *     fica nesse dia (ano do item; se o prazo ja passou ha mais de 300 dias, ano seguinte).
 *   - Numero TCE (12345678-9, com sufixo RO001 etc.) ou CNJ no titulo vincula processoTceId/processoId
 *     quando o processo existe no painel.
 *   - Nao duplica: mesmo titulo + mesmo dia + mesmo advogado ja gravado = pula.
 *   - Sem --gravar so simula.
 *
 * Uso (PowerShell, na pasta do repo):
 *   npx.cmd tsx scripts/importar-agenda-legalone.ts --arquivo "C:\caminho\agenda.json"
 *   npx.cmd tsx scripts/importar-agenda-legalone.ts --arquivo "C:\caminho\agenda.json" --gravar
 */
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ItemAgenda = { sigla: string; dia: string; hora?: string | null; titulo: string };

// Formato bruto que a leitura pelo navegador devolve: { date, hora, texto: "SIGLA Titulo HH:MM" }.
type ItemBruto = { date: string | null; hora?: string | null; texto: string };

function normalizar(x: ItemAgenda | ItemBruto): ItemAgenda | null {
  if ("titulo" in x) return x;
  if (!x.date) return null;
  const m = /^([A-Z]{2,3})\s+(.*)$/.exec(x.texto.trim());
  if (!m) return null;
  const titulo = m[2].replace(/\s*(Dia inteiro|\d{1,2}:\d{2})\s*$/i, "").trim();
  return { sigla: m[1], dia: x.date, hora: x.hora ?? null, titulo };
}

// Sigla da agenda no Legal One -> nome (parcial) do usuario no painel.
const SIGLAS: Record<string, RegExp> = {
  GM: /gabriel/i,
  HC: /helo[ií]sa/i,
  HA: /henrique/i,
  FC: /filipe/i,
  PM: /paulo roberto/i,
  JT: /julio tiago/i,
  ML: /mateus/i,
};

const RE_TCE = /\b(\d{2}\d{5,6}-\d(?:[A-Z]{2,3}\d{3})?)\b/;
const RE_CNJ = /\b(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})\b/;
// "PF 23/10", "Pf! 23/10", "PF REAL: 23/10", "Fatal Real: 23/10", "PF: 03/11"
const RE_PRAZO = /\b(?:pf|prazo\s*fatal|fatal)(?:\s*real)?\s*[!:.]?\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i;

function tipoDe(titulo: string): string {
  const t = titulo.toLowerCase();
  if (/audi[êe]ncia/.test(t)) return "AUDIENCIA";
  if (/sustenta/.test(t)) return "SUSTENTACAO";
  if (/despacho/.test(t)) return "DESPACHO_PRESENCIAL";
  if (/reuni[ãa]o/.test(t)) return "REUNIAO";
  return "OUTRO";
}

// Dia do compromisso: o prazo escrito no titulo, senao o dia do item.
function diaDoCompromisso(item: ItemAgenda): { dia: string; doPrazo: boolean } {
  const m = RE_PRAZO.exec(item.titulo);
  if (!m) return { dia: item.dia, doPrazo: false };
  const d = m[1].padStart(2, "0");
  const mes = m[2].padStart(2, "0");
  let ano = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : item.dia.slice(0, 4);
  let iso = `${ano}-${mes}-${d}`;
  // Prazo em janeiro lancado em dezembro: ano seguinte.
  const dias = (new Date(`${iso}T12:00:00Z`).getTime() - new Date(`${item.dia}T12:00:00Z`).getTime()) / 86400000;
  if (!m[3] && dias < -300) {
    ano = String(Number(ano) + 1);
    iso = `${ano}-${mes}-${d}`;
  }
  if (isNaN(new Date(`${iso}T12:00:00Z`).getTime())) return { dia: item.dia, doPrazo: false };
  // Prazo anterior ao dia em que o item foi agendado (item remarcado ou lembrete tardio):
  // vale o dia do item, que e quando o advogado reservou o trabalho.
  if (iso < item.dia) return { dia: item.dia, doPrazo: false };
  return { dia: iso, doPrazo: true };
}

function dataInicioDe(dia: string, hora: string | null | undefined): { data: Date; diaInteiro: boolean } {
  if (hora && /^\d{1,2}:\d{2}$/.test(hora)) {
    const [h, min] = hora.split(":").map(Number);
    const [a, m, d] = dia.split("-").map(Number);
    // Hora de Recife (UTC-3) gravada em UTC; Date.UTC trata a virada do dia (ex.: 22:30 -> 01:30Z).
    return { data: new Date(Date.UTC(a, m - 1, d, h + 3, min, 0)), diaInteiro: false };
  }
  return { data: new Date(`${dia}T12:00:00Z`), diaInteiro: true };
}

async function main() {
  const args = process.argv.slice(2);
  const gravar = args.includes("--gravar");
  const iArq = args.indexOf("--arquivo");
  const arquivo = iArq >= 0 ? args[iArq + 1] : null;
  if (!arquivo || !fs.existsSync(arquivo)) {
    console.error("Informe --arquivo <caminho do JSON>");
    process.exit(1);
  }
  const iDesde = args.indexOf("--desde");
  const desde = iDesde >= 0 ? args[iDesde + 1] : null; // "aaaa-mm-dd": ignora itens anteriores
  const brutos: (ItemAgenda | ItemBruto)[] = JSON.parse(fs.readFileSync(arquivo, "utf-8"));
  const itens = brutos.map(normalizar).filter((x): x is ItemAgenda => !!x).filter((x) => !desde || x.dia >= desde);
  console.log(`${brutos.length} itens no arquivo, ${itens.length} considerados${desde ? ` (desde ${desde})` : ""}. Modo: ${gravar ? "GRAVAR" : "simulacao"}`);

  const escritorio = await prisma.escritorio.findFirst({ select: { id: true } });
  if (!escritorio) throw new Error("Nenhum escritorio cadastrado");
  const usuarios = await prisma.user.findMany({
    where: { escritorioId: escritorio.id },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { id: true, nome: true, role: true },
  });
  const usuarioDaSigla = (sigla: string) => {
    const re = SIGLAS[sigla.toUpperCase()];
    if (!re) return null;
    // Prefere o usuario ADVOGADO; se nao houver, qualquer um com o nome.
    return usuarios.find((u) => re.test(u.nome) && u.role === "ADVOGADO") ?? usuarios.find((u) => re.test(u.nome)) ?? null;
  };

  let criados = 0, pulados = 0, semUsuario = 0, vinculadosTce = 0, vinculadosJud = 0;
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  for (const item of itens) {
    const u = usuarioDaSigla(item.sigla);
    if (!u) {
      semUsuario++;
      console.log(`  [sem usuario] ${item.sigla} | ${item.titulo}`);
      continue;
    }
    const { dia, doPrazo } = diaDoCompromisso(item);
    const { data, diaInteiro } = dataInicioDe(dia, doPrazo ? null : item.hora);
    const titulo = item.titulo.replace(/\s+/g, " ").trim();

    const numTce = RE_TCE.exec(titulo)?.[1] ?? null;
    const numCnj = RE_CNJ.exec(titulo)?.[1] ?? null;
    const tce = numTce ? await prisma.processoTce.findFirst({ where: { numero: numTce, escritorioId: escritorio.id }, select: { id: true } }) : null;
    const jud = numCnj ? await prisma.processo.findFirst({ where: { numero: numCnj, escritorioId: escritorio.id }, select: { id: true } }) : null;
    if (tce) vinculadosTce++;
    if (jud) vinculadosJud++;

    const ini = new Date(`${dia}T00:00:00Z`), fim = new Date(`${dia}T23:59:59Z`);
    const existe = await prisma.compromisso.findFirst({
      where: { escritorioId: escritorio.id, advogadoId: u.id, titulo, dataInicio: { gte: ini, lte: fim } },
      select: { id: true },
    });
    if (existe) {
      pulados++;
      continue;
    }
    console.log(`  + ${dia}${diaInteiro ? "" : ` ${item.hora}`} | ${item.sigla} -> ${u.nome} | ${tipoDe(titulo)} | ${titulo}${tce ? " [TCE vinculado]" : ""}${jud ? " [judicial vinculado]" : ""}${doPrazo ? " (dia do prazo)" : ""}`);
    if (gravar) {
      await prisma.compromisso.create({
        data: {
          titulo,
          descricao: `Importado da agenda do Legal One (${item.sigla.toUpperCase()}) em ${hoje}; item lançado no dia ${item.dia}.`,
          dataInicio: data,
          diaInteiro,
          tipo: tipoDe(titulo),
          categoria: "ESCRITORIO",
          privado: false,
          advogadoId: u.id,
          processoTceId: tce?.id ?? null,
          processoId: jud?.id ?? null,
          escritorioId: escritorio.id,
        },
      });
    }
    criados++;
  }
  console.log(`\n${gravar ? "Gravados" : "A gravar"}: ${criados} · ja existiam: ${pulados} · sem usuario: ${semUsuario} · vinculados TCE: ${vinculadosTce} · judiciais: ${vinculadosJud}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
