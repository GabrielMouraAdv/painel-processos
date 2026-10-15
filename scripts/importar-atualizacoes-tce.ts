/**
 * Carga em lote de andamentos, julgamentos e dispensas de contrarrazoes (TCE).
 *
 * Uso:
 *   npx tsx scripts/importar-atualizacoes-tce.ts <entrada.json> <relatorio.json>            (simulacao)
 *   npx tsx scripts/importar-atualizacoes-tce.ts <entrada.json> <relatorio.json> --gravar <desfazer.json>
 *
 * <entrada.json> vem de ler_carga.py (planilha com abas Andamentos, Julgamentos, Dispensas).
 *
 * Regras:
 * - Processo identificado pelo numero exato (recurso e registro proprio: 16100132-4ED001).
 * - Andamento: pula se ja existe no processo um andamento no mesmo dia e com a mesma fase.
 * - Julgamento: campo vazio no painel e preenchido; campo igual e mantido; campo diferente
 *   e CONFLITO e a linha inteira nao e gravada.
 * - Dispensa: pula se o processo ja tem a dispensa registrada.
 * - Datas gravadas ao meio-dia UTC (aparecem no dia certo em qualquer fuso do Brasil).
 * - Nao altera a fase atual do processo e nao gera prazos.
 * - Com --gravar: arquivo de desfazer + registro no Log de Auditoria.
 */
import { PrismaClient, type TipoProcessoTce } from "@prisma/client";
import { readFileSync, writeFileSync } from "fs";

import { PENALIDADES_TCE, RESULTADOS_POR_TIPO_TCE } from "../lib/julgamento-config";
import { fasesDoTipo } from "../lib/tce-config";

const prisma = new PrismaClient();
const [ENTRADA, RELATORIO] = process.argv.slice(2);
const GRAVAR = process.argv.includes("--gravar");
const DESFAZER = GRAVAR ? process.argv[process.argv.indexOf("--gravar") + 1] : null;
const GABRIEL_ID = "cmob0aygv0001khuojjubwb0i";

type Base = { linha: number; numero: string; data: string | null; erros: string[] };
type LinhaAndamento = Base & { fase: string; descricao: string };
type LinhaJulgamento = Base & {
  resultado: string;
  penalidade: string | null;
  valor_multa: number | null;
  valor_devolucao: number | null;
  observacoes: string | null;
};
type LinhaDispensa = Base & { tipo: string; advogado: string; motivo: string | null };
type Entrada = {
  andamentos: LinhaAndamento[];
  julgamentos: LinhaJulgamento[];
  dispensas: LinhaDispensa[];
  errosLeitura: string[];
};

type Status = "gravar" | "pular" | "conflito" | "erro";
type Resultado = { aba: string; linha: number; numero: string; status: Status; detalhe: string };

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

// Data so-de-dia gravada ao meio-dia UTC.
const meioDia = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
const br = (iso: string) => iso.split("-").reverse().join("/");
const reais = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Dia (aaaa-mm-dd) de um valor ja gravado. Registros antigos de data pura estao a 00:00Z
// (o dia certo e o dia UTC); os demais sao horarios reais e valem no fuso de Recife.
const fmtRecife = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit" });
function diaDe(d: Date): string {
  const meiaNoiteUtc = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  return meiaNoiteUtc ? d.toISOString().slice(0, 10) : fmtRecife.format(d);
}

const CAMPOS_DISPENSA = {
  NT: {
    flag: "contrarrazoesNtDispensadas",
    por: "contrarrazoesNtDispensadoPor",
    em: "contrarrazoesNtDispensadoEm",
    motivo: "contrarrazoesNtDispensadoMotivo",
    fase: "contrarrazoes_nt_dispensadas",
    nome: "Contrarrazoes a Nota Tecnica",
  },
  MPCO: {
    flag: "contrarrazoesMpcoDispensadas",
    por: "contrarrazoesMpcoDispensadoPor",
    em: "contrarrazoesMpcoDispensadoEm",
    motivo: "contrarrazoesMpcoDispensadoMotivo",
    fase: "contrarrazoes_mpco_dispensadas",
    nome: "Contrarrazoes ao Parecer MPCO",
  },
} as const;

async function main() {
  if (!ENTRADA || !RELATORIO || (GRAVAR && !DESFAZER)) {
    throw new Error("Uso: importar-atualizacoes-tce.ts <entrada.json> <relatorio.json> [--gravar <desfazer.json>]");
  }
  const entrada: Entrada = JSON.parse(readFileSync(ENTRADA, "utf-8"));
  const res: Resultado[] = [];
  const add = (aba: string, l: Base, status: Status, detalhe: string) =>
    res.push({ aba, linha: l.linha, numero: l.numero, status, detalhe });

  const numeros = [...new Set([...entrada.andamentos, ...entrada.julgamentos, ...entrada.dispensas].map((l) => l.numero))];
  const processos = await prisma.processoTce.findMany({
    where: { numero: { in: numeros } },
    select: {
      id: true, numero: true, tipo: true, julgado: true,
      dataJulgamento: true, resultadoJulgamento: true, penalidade: true,
      valorMulta: true, valorDevolucao: true, observacoesJulgamento: true,
      contrarrazoesNtDispensadas: true, contrarrazoesNtDispensadoPor: true, contrarrazoesNtDispensadoEm: true, contrarrazoesNtDispensadoMotivo: true,
      contrarrazoesMpcoDispensadas: true, contrarrazoesMpcoDispensadoPor: true, contrarrazoesMpcoDispensadoEm: true, contrarrazoesMpcoDispensadoMotivo: true,
      andamentos: { select: { data: true, fase: true } },
    },
  });
  const porNumero = new Map(processos.map((p) => [p.numero, p]));
  // chaves processo|dia|fase ja existentes (inclui as que esta carga vai criar)
  const chaves = new Set(processos.flatMap((p) => p.andamentos.map((a) => `${p.id}|${diaDe(a.data)}|${a.fase}`)));

  const usuarios = await prisma.user.findMany({ select: { id: true, nome: true, email: true } });
  const nomesUsuarios = new Map<string, string>();
  for (const u of usuarios) if (!nomesUsuarios.has(norm(u.nome))) nomesUsuarios.set(norm(u.nome), u.nome);

  // Operacoes a executar, agrupadas por processo.
  type Op =
    | { kind: "andamento"; processoId: string; data: Date; fase: string; descricao: string }
    | { kind: "update"; processoId: string; campos: Record<string, unknown> };
  const ops: Op[] = [];

  const processoOuErro = (aba: string, l: Base) => {
    if (l.erros.length) { add(aba, l, "erro", l.erros.join("; ")); return null; }
    const p = porNumero.get(l.numero);
    if (!p) { add(aba, l, "erro", `processo ${l.numero} nao existe no painel`); return null; }
    return p;
  };

  // ---------------------------------------------------------------- Andamentos
  for (const l of entrada.andamentos) {
    const p = processoOuErro("Andamentos", l);
    if (!p) continue;
    const validas = fasesDoTipo(p.tipo as TipoProcessoTce).map((f) => f.key);
    if (!validas.includes(l.fase)) { add("Andamentos", l, "erro", `fase '${l.fase}' nao vale para ${p.tipo}. Validas: ${validas.join(", ")}`); continue; }
    if (!l.descricao) { add("Andamentos", l, "erro", "descricao vazia"); continue; }
    const chave = `${p.id}|${l.data}|${l.fase}`;
    if (chaves.has(chave)) { add("Andamentos", l, "pular", `ja existe andamento '${l.fase}' em ${br(l.data!)}`); continue; }
    chaves.add(chave);
    ops.push({ kind: "andamento", processoId: p.id, data: meioDia(l.data!), fase: l.fase, descricao: l.descricao });
    add("Andamentos", l, "gravar", `andamento '${l.fase}' em ${br(l.data!)}`);
  }

  // ---------------------------------------------------------------- Julgamentos
  for (const l of entrada.julgamentos) {
    const p = processoOuErro("Julgamentos", l);
    if (!p) continue;
    const validos = RESULTADOS_POR_TIPO_TCE[p.tipo as TipoProcessoTce];
    if (!validos.includes(l.resultado)) { add("Julgamentos", l, "erro", `resultado '${l.resultado}' nao vale para ${p.tipo}. Validos: ${validos.join(" | ")}`); continue; }
    if (l.penalidade && !PENALIDADES_TCE.includes(l.penalidade)) { add("Julgamentos", l, "erro", `penalidade '${l.penalidade}' invalida`); continue; }

    const novo: Record<string, { atual: unknown; novo: unknown; igual: boolean; vazio: boolean; rotulo: string }> = {
      dataJulgamento: {
        atual: p.dataJulgamento, novo: meioDia(l.data!), rotulo: "data",
        igual: !!p.dataJulgamento && diaDe(p.dataJulgamento) === l.data, vazio: !p.dataJulgamento,
      },
      resultadoJulgamento: { atual: p.resultadoJulgamento, novo: l.resultado, rotulo: "resultado", igual: p.resultadoJulgamento === l.resultado, vazio: !p.resultadoJulgamento },
      penalidade: { atual: p.penalidade, novo: l.penalidade, rotulo: "penalidade", igual: (p.penalidade ?? null) === (l.penalidade ?? null), vazio: !p.penalidade },
      valorMulta: { atual: p.valorMulta, novo: l.valor_multa, rotulo: "valor da multa", igual: Number(p.valorMulta ?? 0) === Number(l.valor_multa ?? 0), vazio: p.valorMulta === null },
      valorDevolucao: { atual: p.valorDevolucao, novo: l.valor_devolucao, rotulo: "valor da devolucao", igual: Number(p.valorDevolucao ?? 0) === Number(l.valor_devolucao ?? 0), vazio: p.valorDevolucao === null },
      observacoesJulgamento: { atual: p.observacoesJulgamento, novo: l.observacoes, rotulo: "observacoes", igual: norm(p.observacoesJulgamento) === norm(l.observacoes), vazio: !p.observacoesJulgamento },
    };
    const conflitos = Object.values(novo).filter((c) => !c.igual && !c.vazio && c.novo !== null && c.novo !== undefined);
    if (conflitos.length) {
      add("Julgamentos", l, "conflito", conflitos.map((c) => `${c.rotulo}: painel '${c.atual instanceof Date ? br(diaDe(c.atual)) : c.atual}' x planilha '${c.novo instanceof Date ? br(l.data!) : c.novo}'`).join("; "));
      continue;
    }
    const preencher = Object.entries(novo).filter(([, c]) => !c.igual && c.vazio && c.novo !== null && c.novo !== undefined);
    if (!preencher.length && p.julgado) { add("Julgamentos", l, "pular", "julgamento ja registrado igual"); continue; }
    const campos: Record<string, unknown> = { julgado: true };
    for (const [k, c] of preencher) campos[k] = c.novo;
    ops.push({ kind: "update", processoId: p.id, campos });

    const chave = `${p.id}|${l.data}|julgamento`;
    let extra = "";
    if (!chaves.has(chave)) {
      chaves.add(chave);
      const partes: string[] = [];
      if (l.penalidade) partes.push(`Penalidade: ${l.penalidade}`);
      if (l.valor_multa) partes.push(`Multa R$ ${reais(l.valor_multa)}`);
      if (l.valor_devolucao) partes.push(`Devolucao R$ ${reais(l.valor_devolucao)}`);
      const sufixo = partes.length ? ` ${partes.join(" • ")}.` : "";
      ops.push({
        kind: "andamento", processoId: p.id, data: meioDia(l.data!), fase: "julgamento",
        descricao: `Processo julgado em ${br(l.data!)}: ${l.resultado}.${sufixo}${l.observacoes ? ` Observacoes: ${l.observacoes}` : ""}`,
      });
      extra = " + andamento 'julgamento'";
    }
    add("Julgamentos", l, "gravar", `preenche ${preencher.map(([, c]) => c.rotulo).join(", ") || "marca como julgado"}${extra}`);
  }

  // ---------------------------------------------------------------- Dispensas
  for (const l of entrada.dispensas) {
    const p = processoOuErro("Dispensas", l);
    if (!p) continue;
    if (l.tipo !== "NT" && l.tipo !== "MPCO") { add("Dispensas", l, "erro", `NT_ou_MPCO deve ser NT ou MPCO (veio '${l.tipo}')`); continue; }
    const adv = nomesUsuarios.get(norm(l.advogado));
    if (!adv) { add("Dispensas", l, "erro", `advogado '${l.advogado}' nao e usuario cadastrado`); continue; }
    const c = CAMPOS_DISPENSA[l.tipo];
    if (p[c.flag]) { add("Dispensas", l, "pular", `${c.nome} ja dispensadas (${p[c.por] ?? "?"})`); continue; }
    ops.push({ kind: "update", processoId: p.id, campos: { [c.flag]: true, [c.por]: adv, [c.em]: meioDia(l.data!), [c.motivo]: l.motivo } });
    const chave = `${p.id}|${l.data}|${c.fase}`;
    let extra = "";
    if (!chaves.has(chave)) {
      chaves.add(chave);
      ops.push({
        kind: "andamento", processoId: p.id, data: meioDia(l.data!), fase: c.fase,
        descricao: `${c.nome} dispensadas por ${adv} em ${br(l.data!)}.${l.motivo ? ` Motivo: ${l.motivo}` : ""}`,
      });
      extra = " + andamento";
    }
    add("Dispensas", l, "gravar", `dispensa ${l.tipo} por ${adv}${extra}`);
  }

  const resumo = {
    modo: GRAVAR ? "GRAVACAO" : "SIMULACAO",
    errosLeitura: entrada.errosLeitura,
    total: res.length,
    porStatus: res.reduce<Record<string, number>>((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {}),
    operacoes: { andamentos: ops.filter((o) => o.kind === "andamento").length, atualizacoes: ops.filter((o) => o.kind === "update").length },
  };

  // ---------------------------------------------------------------- Gravacao
  const desfazer = { andamentosCriados: [] as string[], processosAntes: [] as { id: string; numero: string; campos: Record<string, unknown> }[] };
  if (GRAVAR && ops.length) {
    const ids = [...new Set(ops.map((o) => o.processoId))];
    for (const id of ids) {
      const meus = ops.filter((o) => o.processoId === id);
      const campos = Object.assign({}, ...meus.filter((o) => o.kind === "update").map((o) => (o as { campos: Record<string, unknown> }).campos));
      const p = processos.find((x) => x.id === id)!;
      const antes: Record<string, unknown> = {};
      for (const k of Object.keys(campos)) antes[k] = (p as Record<string, unknown>)[k] ?? null;
      const criados = await prisma.$transaction(async (tx) => {
        if (Object.keys(campos).length) await tx.processoTce.update({ where: { id }, data: campos });
        const out: string[] = [];
        for (const o of meus) {
          if (o.kind !== "andamento") continue;
          const a = await tx.andamentoTce.create({ data: { processoId: id, data: o.data, fase: o.fase, descricao: o.descricao, autorId: GABRIEL_ID }, select: { id: true } });
          out.push(a.id);
        }
        return out;
      });
      desfazer.andamentosCriados.push(...criados);
      if (Object.keys(antes).length) desfazer.processosAntes.push({ id, numero: p.numero, campos: antes });
      writeFileSync(DESFAZER!, JSON.stringify(desfazer, null, 1), "utf-8");
    }
    await prisma.logAuditoria.create({
      data: {
        userId: GABRIEL_ID, acao: "IMPORTAR_ATUALIZACOES_TCE", entidade: "ProcessoTce",
        descricao: `Carga em lote de atualizacoes TCE: ${desfazer.andamentosCriados.length} andamentos criados, ${desfazer.processosAntes.length} processos atualizados.`,
        detalhes: JSON.stringify(resumo),
      },
    });
  }

  writeFileSync(RELATORIO, JSON.stringify({ resumo, linhas: res }, null, 1), "utf-8");
  console.log(JSON.stringify(resumo));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
