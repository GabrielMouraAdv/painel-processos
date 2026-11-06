import type { Prisma } from "@prisma/client";

import {
  categoriaDeliberacao,
  categoriaDocumento,
  categoriaTarefa,
  EtceErro,
  lerProcessoEtce,
  numeroBaseEtce,
  type LeituraEtce,
} from "@/lib/etce";
import { prisma } from "@/lib/prisma";

/**
 * Coletor semanal do e-TCEPE.
 *
 * Periodo de comparacao com a planilha do Cowork (ate jan/2027): grava SO em
 * ColetaEtce/EventoEtce. Nao cria AndamentoTce, nao muda fase nem flags do
 * ProcessoTce. O relatorio scripts/comparar-coleta-etce.ts confronta as fontes.
 *
 * Alvo: processos EM ANDAMENTO (sem transito em julgado e nao julgados, inclusive
 * recursos), reduzidos ao numero-base do e-TCEPE.
 */

export type EventoNovo = {
  numeroBase: string;
  tipo: "DOCUMENTO" | "DELIBERACAO" | "MOVIMENTACAO" | "RECURSO";
  categoria: string;
  chave: string;
  data: string | null;
  descricao: string;
};

export type ResultadoProcesso = {
  numeroBase: string;
  ok: boolean;
  erro?: string;
  primeiraLeitura: boolean;
  novos: EventoNovo[];
  tarefasAbertas: string[];
};

/** Numeros-base dos processos em andamento, na ordem de verificacao (mais antigo primeiro). */
export async function alvosEmAndamento(): Promise<string[]> {
  const processos = await prisma.processoTce.findMany({
    where: { dataTransito: null, julgado: false },
    select: { numero: true },
  });
  const bases = new Set<string>();
  for (const p of processos) {
    const b = numeroBaseEtce(p.numero);
    if (b) bases.add(b);
  }
  const coletas = await prisma.coletaEtce.findMany({
    where: { numeroBase: { in: Array.from(bases) } },
    select: { numeroBase: true, verificadoEm: true },
  });
  const quando = new Map(coletas.map((c) => [c.numeroBase, c.verificadoEm?.getTime() ?? 0]));
  return Array.from(bases).sort((a, b) => (quando.get(a) ?? 0) - (quando.get(b) ?? 0));
}

function eventosDaLeitura(l: LeituraEtce): EventoNovo[] {
  const ev: EventoNovo[] = [];
  for (const d of l.documentos) {
    ev.push({
      numeroBase: l.numeroBase,
      tipo: "DOCUMENTO",
      categoria: categoriaDocumento(d.classificacao),
      chave: d.numero,
      data: d.data,
      descricao: `${d.classificacao}: ${d.descricao}${d.assinantes ? ` (${d.assinantes})` : ""}`,
    });
  }
  for (const d of l.deliberacoes) {
    ev.push({
      numeroBase: l.numeroBase,
      tipo: "DELIBERACAO",
      categoria: categoriaDeliberacao(d.tipo),
      chave: `${d.numero}|${d.tipo}`,
      data: d.data,
      descricao:
        // d.numero e o numero do DOCUMENTO no processo, nao o numero oficial do acordao.
        `${d.tipo} (doc. ${d.numero})` +
        (d.colegiado ? ` (${d.colegiado})` : "") +
        (d.dataPublicacao ? `, DOE ${d.dataPublicacao.split("-").reverse().join("/")}` : "") +
        (d.pagina ? `, p. ${d.pagina}` : ""),
    });
  }
  for (const m of l.movimentacoes) {
    ev.push({
      numeroBase: l.numeroBase,
      tipo: "MOVIMENTACAO",
      categoria: categoriaTarefa(m.tarefa),
      chave: `${m.tarefa}|${m.inicio ?? ""}`,
      data: m.inicio,
      descricao: `${m.tarefa} (início ${m.inicio ?? "?"}${m.fim ? `, fim ${m.fim}` : ", em aberto"})`,
    });
  }
  for (const r of l.recursos) {
    ev.push({
      numeroBase: l.numeroBase,
      tipo: "RECURSO",
      categoria: "RECURSO",
      chave: r.numero,
      data: r.dataEntrada,
      descricao: `${r.especie} ${r.numero}` + (r.situacao ? ` — ${r.situacao}` : ""),
    });
  }
  return ev;
}

const meioDiaUtc = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00.000Z`) : null);

/** Le um processo e, se gravar=true, persiste a leitura e os eventos novos. */
export async function coletarProcesso(
  numeroBase: string,
  opts: { gravar: boolean },
): Promise<ResultadoProcesso> {
  const anterior = await prisma.coletaEtce.findUnique({
    where: { numeroBase },
    select: { id: true, falhasSeguidas: true },
  });
  const existentes = await prisma.eventoEtce.findMany({
    where: { numeroBase },
    select: { tipo: true, chave: true },
  });
  // Sem nenhum evento guardado = primeira leitura: tudo o que ja existe no e-TCEPE
  // e linha de base, nao novidade (uma falha no meio do caminho nao reinicia isso).
  const primeiraLeitura = existentes.length === 0;

  let leitura: LeituraEtce;
  try {
    leitura = await lerProcessoEtce(numeroBase, { todosDocumentos: primeiraLeitura });
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    if (opts.gravar) {
      await prisma.coletaEtce.upsert({
        where: { numeroBase },
        create: { numeroBase, verificadoEm: new Date(), ok: false, erro, falhasSeguidas: 1 },
        update: {
          verificadoEm: new Date(),
          erro,
          falhasSeguidas: (anterior?.falhasSeguidas ?? 0) + 1,
        },
      });
    }
    // Fora do ar: propaga para a rodada parar de insistir.
    if (err instanceof EtceErro && err.tipo === "FORA_DO_AR") throw err;
    return { numeroBase, ok: false, erro, primeiraLeitura, novos: [], tarefasAbertas: [] };
  }

  const todos = eventosDaLeitura(leitura);
  const visto = new Set(existentes.map((e) => `${e.tipo}#${e.chave}`));
  const novos = todos.filter((e) => !visto.has(`${e.tipo}#${e.chave}`));
  const tarefasAbertas = leitura.movimentacoes.filter((m) => !m.fim).map((m) => m.tarefa);

  if (opts.gravar) {
    const json = (v: unknown) => v as Prisma.InputJsonValue;
    await prisma.$transaction([
      prisma.coletaEtce.upsert({
        where: { numeroBase },
        create: {
          numeroBase,
          verificadoEm: new Date(),
          ok: true,
          cabecalho: leitura.cabecalho,
          tarefasAbertas,
          documentos: json(leitura.documentos),
          deliberacoes: json(leitura.deliberacoes),
          movimentacoes: json(leitura.movimentacoes),
          recursos: json(leitura.recursos),
        },
        update: {
          verificadoEm: new Date(),
          ok: true,
          erro: null,
          falhasSeguidas: 0,
          cabecalho: leitura.cabecalho,
          tarefasAbertas,
          documentos: json(leitura.documentos),
          deliberacoes: json(leitura.deliberacoes),
          movimentacoes: json(leitura.movimentacoes),
          recursos: json(leitura.recursos),
        },
      }),
      prisma.eventoEtce.createMany({
        data: novos.map((e) => ({
          numeroBase: e.numeroBase,
          tipo: e.tipo,
          categoria: e.categoria,
          chave: e.chave,
          data: meioDiaUtc(e.data),
          descricao: e.descricao,
          linhaDeBase: primeiraLeitura,
        })),
        skipDuplicates: true,
      }),
    ]);
  }

  return { numeroBase, ok: true, primeiraLeitura, novos, tarefasAbertas };
}

/**
 * Rodada: le os alvos com poucas conexoes simultaneas ate o prazo.
 * Para tudo se o e-TCEPE estiver fora do ar.
 */
export async function rodadaColeta(opts: {
  gravar: boolean;
  deadline: number;
  concorrencia?: number;
  alvos?: string[];
}): Promise<{
  alvos: number;
  lidos: number;
  falhas: { numeroBase: string; erro: string }[];
  foraDoAr: boolean;
  resultados: ResultadoProcesso[];
}> {
  const fila = [...(opts.alvos ?? (await alvosEmAndamento()))];
  const total = fila.length;
  const resultados: ResultadoProcesso[] = [];
  const falhas: { numeroBase: string; erro: string }[] = [];
  let foraDoAr = false;

  async function trabalhador() {
    while (fila.length && !foraDoAr && Date.now() < opts.deadline) {
      const n = fila.shift() as string;
      try {
        const r = await coletarProcesso(n, { gravar: opts.gravar });
        resultados.push(r);
        if (!r.ok) falhas.push({ numeroBase: n, erro: r.erro ?? "erro" });
      } catch (err) {
        foraDoAr = err instanceof EtceErro && err.tipo === "FORA_DO_AR";
        falhas.push({ numeroBase: n, erro: err instanceof Error ? err.message : String(err) });
      }
    }
  }
  await Promise.all(Array.from({ length: opts.concorrencia ?? 3 }, trabalhador));
  return { alvos: total, lidos: resultados.length, falhas, foraDoAr, resultados };
}

/** Categorias que interessam ao advogado (o resto fica guardado, mas nao alerta). */
export const CATEGORIAS_MARCO = new Set([
  "NOTA_TECNICA",
  "PEDIDO_NT",
  "PARECER_MPCO",
  "COTA_MPCO",
  "PEDIDO_MPCO",
  "DEFESA",
  "DELIBERACAO_MERITO",
  "DELIBERACAO",
  "NOTIFICACAO",
  "RELATORIO_AUDITORIA",
  "PRAZO_RECURSAL",
  "PAUTA",
  "VISTA",
  "AGUARDA_NT_MPCO",
  "INSTRUCAO",
  "ENCERRAMENTO",
  "RECURSO",
]);
