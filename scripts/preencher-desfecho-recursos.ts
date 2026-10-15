/**
 * Preenche, a partir do que ja esta escrito no painel, os campos novos de desfecho:
 *  - recurso: resultadoRecurso (das observacoes do julgamento ou do andamento "julgamento"),
 *    numeroAcordao, orgaoJulgador, dataSessao (= data do julgamento) e dataTransito;
 *  - processo de origem: dataTransito.
 * Trânsito: andamento "transitado"/"transitado_cautelar" ou "transito em dd/mm/aaaa" no texto.
 * So preenche campo vazio. Texto com mais de um desfecho vai para a lista de ambiguos.
 *
 * Uso:
 *   npx tsx scripts/preencher-desfecho-recursos.ts <relatorio.json>                         (simulacao)
 *   npx tsx scripts/preencher-desfecho-recursos.ts <relatorio.json> --gravar <desfazer.json>
 *   npx tsx scripts/preencher-desfecho-recursos.ts --desfazer <desfazer.json>
 */
import { PrismaClient, type CamaraTce, type ResultadoRecursoTce } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

const prisma = new PrismaClient();
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Desfecho do recurso pelo texto. Se o texto inteiro for ambiguo, vale a primeira frase
// (ex.: "RO nao provido; decisao posteriormente rescindida (PR001 provido)").
function desfechoDoTexto(texto: string): ResultadoRecursoTce | "AMBIGUO" | null {
  const todo = desfechoDoTrecho(texto);
  if (todo !== "AMBIGUO") return todo;
  const primeira = desfechoDoTrecho(texto.split(/[;(]/)[0]);
  return primeira ?? "AMBIGUO";
}

function desfechoDoTrecho(texto: string): ResultadoRecursoTce | "AMBIGUO" | null {
  let t = norm(texto);
  const achados = new Set<ResultadoRecursoTce>();
  const regras: [ResultadoRecursoTce, RegExp][] = [
    ["NAO_CONHECIDO", /nao conhecid[oa]s?|inadmitid[oa]s?|nao admitid[oa]s?/g],
    ["PROVIDO_EM_PARTE", /provid[oa]s? em parte|provid[oa]s? parcialmente|parcialmente provid[oa]s?|provimento parcial|parcial provimento/g],
    ["NAO_PROVIDO", /nao provid[oa]s?|desprovid[oa]s?|improvid[oa]s?|negad[oa] provimento|negou provimento|nao provimento/g],
    ["PREJUDICADO", /prejudicad[oa]s?|perda (de|do) objeto/g],
  ];
  for (const [r, re] of regras) {
    if (re.test(t)) achados.add(r);
    t = t.replace(re, " ");
  }
  if (/provid[oa]s?|provimento/.test(t)) achados.add("PROVIDO");
  if (achados.size === 0) return null;
  return achados.size === 1 ? [...achados][0] : "AMBIGUO";
}

function acordaoDoTexto(texto: string): string | null {
  const m = /ac(?:ordao|\.)\s*(?:n[ºo°.]*\s*)?(\d{1,5}\/\d{4})/i.exec(norm(texto));
  return m ? m[1] : null;
}

function orgaoDoTexto(texto: string): CamaraTce | null {
  const t = norm(texto);
  const achados = new Set<CamaraTce>();
  if (/\bpleno\b/.test(t)) achados.add("PLENO");
  if (/(1a|1ª|primeira) camara/.test(t)) achados.add("PRIMEIRA");
  if (/(2a|2ª|segunda) camara/.test(t)) achados.add("SEGUNDA");
  return achados.size === 1 ? [...achados][0] : null;
}

function transitoDoTexto(texto: string): Date | null {
  const m = /transit\w*(?: em julgado)?(?: certificado)?(?: em)?\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(norm(texto));
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00.000Z`) : null;
}

async function main() {
  const iDesfazer = process.argv.indexOf("--desfazer");
  if (iDesfazer > -1) {
    const d: { id: string; antes: Record<string, unknown> }[] = JSON.parse(readFileSync(process.argv[iDesfazer + 1], "utf-8"));
    for (const x of d) {
      const antes = Object.fromEntries(Object.entries(x.antes).map(([k, v]) => [k, typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) ? new Date(v) : v]));
      await prisma.processoTce.update({ where: { id: x.id }, data: antes });
    }
    console.log(`desfeito: ${d.length} processos`);
    return;
  }

  const RELATORIO = process.argv[2];
  const iGravar = process.argv.indexOf("--gravar");
  // ANTES_DA_MIGRACAO=1: simula sem ler os campos novos (ainda inexistentes, logo vazios).
  const antesDaMigracao = process.env.ANTES_DA_MIGRACAO === "1";
  const base = await prisma.processoTce.findMany({
    select: {
      id: true, numero: true, ehRecurso: true, julgado: true, dataJulgamento: true, observacoesJulgamento: true,
      andamentos: { select: { data: true, fase: true, descricao: true }, orderBy: { data: "desc" } },
    },
  });
  const novos = antesDaMigracao
    ? new Map<string, Record<string, unknown>>()
    : new Map(
        (await prisma.processoTce.findMany({ select: { id: true, resultadoRecurso: true, numeroAcordao: true, orgaoJulgador: true, dataSessao: true, dataTransito: true } }))
          .map(({ id, ...r }) => [id, r as Record<string, unknown>]),
      );
  const procs = base.map((p) => ({
    ...p,
    resultadoRecurso: null, numeroAcordao: null, orgaoJulgador: null, dataSessao: null, dataTransito: null,
    ...(novos.get(p.id) ?? {}),
  })) as (typeof base[number] & { resultadoRecurso: ResultadoRecursoTce | null; numeroAcordao: string | null; orgaoJulgador: CamaraTce | null; dataSessao: Date | null; dataTransito: Date | null })[];

  const mudancas: { id: string; numero: string; antes: Record<string, unknown>; depois: Record<string, unknown> }[] = [];
  const ambiguos: { numero: string; texto: string }[] = [];
  const cont: Record<string, number> = {};
  const inc = (k: string) => (cont[k] = (cont[k] ?? 0) + 1);

  for (const p of procs) {
    const depois: Record<string, unknown> = {};
    const andJulg = p.andamentos.find((a) => a.fase === "julgamento");
    const andTrans = p.andamentos.find((a) => a.fase === "transitado" || a.fase === "transitado_cautelar");
    const textoJulg = [p.observacoesJulgamento, andJulg?.descricao].filter(Boolean).join(" | ");

    if (p.ehRecurso && p.julgado) {
      if (!p.resultadoRecurso) {
        const d = desfechoDoTexto(p.observacoesJulgamento ?? "") ?? desfechoDoTexto(andJulg?.descricao ?? "");
        if (d === "AMBIGUO") { ambiguos.push({ numero: p.numero, texto: textoJulg.slice(0, 220) }); inc("ambiguo"); }
        else if (d) { depois.resultadoRecurso = d; inc(`desfecho ${d}`); }
        else inc("sem desfecho no texto");
      }
      if (!p.numeroAcordao) { const a = acordaoDoTexto(textoJulg); if (a) { depois.numeroAcordao = a; inc("acordao"); } }
      if (!p.orgaoJulgador) { const o = orgaoDoTexto(textoJulg); if (o) { depois.orgaoJulgador = o; inc("orgao julgador"); } }
      if (!p.dataSessao && p.dataJulgamento) { depois.dataSessao = p.dataJulgamento; inc("data da sessao"); }
    }
    if (!p.dataTransito) {
      const t = andTrans?.data ?? transitoDoTexto(p.observacoesJulgamento ?? "");
      if (t) { depois.dataTransito = t; inc(p.ehRecurso ? "transito (recurso)" : "transito (processo)"); }
    }
    if (Object.keys(depois).length) {
      const antes = Object.fromEntries(Object.keys(depois).map((k) => [k, (p as Record<string, unknown>)[k] ?? null]));
      mudancas.push({ id: p.id, numero: p.numero, antes, depois });
    }
  }

  console.log(`Processos com algo a preencher: ${mudancas.length}`);
  console.log(Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
  writeFileSync(RELATORIO, JSON.stringify({ cont, ambiguos, mudancas }, null, 1), "utf-8");

  if (iGravar === -1) { console.log("SIMULACAO: nada foi gravado."); return; }
  const arq = process.argv[iGravar + 1];
  if (!arq) throw new Error("Informe o arquivo de desfazer depois de --gravar");
  writeFileSync(arq, JSON.stringify(mudancas.map(({ id, antes }) => ({ id, antes })), null, 1), "utf-8");
  for (const m of mudancas) await prisma.processoTce.update({ where: { id: m.id }, data: m.depois });
  await prisma.logAuditoria.create({
    data: {
      userId: GABRIEL_ID, acao: "PREENCHER_DESFECHO_RECURSOS", entidade: "ProcessoTce",
      descricao: `Desfecho de recursos e transito preenchidos a partir do texto ja gravado: ${mudancas.length} processos.`,
      detalhes: JSON.stringify(cont),
    },
  });
  console.log(`GRAVADO. Desfazer: ${arq}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
