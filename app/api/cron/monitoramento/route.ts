import { NextResponse } from "next/server";

import { processarFilaDjen } from "@/lib/djen-fila";
import { varrerDjenPorOab } from "@/lib/djen-oab";
import { verificarProcessoMonitorado } from "@/lib/monitoramento-verificar";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Orcamento de tempo dentro do maxDuration de 300s:
//   1. varredura do DJEN por OAB (fonte primaria, ~1 requisicao por OAB):
//      ate 60s;
//   2. Datajud (complemento) com o que sobrar ate 210s — processos nao
//      verificados hoje entram primeiro amanha (ordenacao por
//      ultimaVerificacao);
//   3. fila DJEN (inteiro teor das movimentacoes) ate 270s;
//   4. 30s finais de folga para gravar e responder.
const BUDGET_DJEN_OAB_MS = 60_000;
const BUDGET_VERIFICACAO_MS = 210_000;
const BUDGET_TOTAL_MS = 270_000;
const DJEN_OAB_DIAS = 3;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  const ok =
    expected.length > 0 && auth === `Bearer ${expected}`;

  if (!ok) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  // ?simular=1 — so a varredura por OAB, sem gravar nada e sem Datajud/fila.
  // Serve para conferir o que o DJEN devolve antes de aplicar a migracao.
  const url = new URL(req.url);
  const simular = url.searchParams.get("simular") === "1";
  const diasParam = Number(url.searchParams.get("dias"));
  const diasOab =
    Number.isFinite(diasParam) && diasParam >= 1 && diasParam <= 60
      ? Math.trunc(diasParam)
      : DJEN_OAB_DIAS;

  const inicio = Date.now();
  const erros: { processoId: string; numero: string; erro: string }[] = [];

  function msg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  // ------------------------------------------------ 1. DJEN por OAB (primario)
  let djenOab = null;
  try {
    djenOab = await varrerDjenPorOab({
      dias: diasOab,
      gravar: !simular,
      deadline: inicio + BUDGET_DJEN_OAB_MS,
    });
    for (const o of djenOab.porOab) {
      if (o.erro) {
        erros.push({ processoId: "(djen oab)", numero: o.oab, erro: o.erro });
      }
    }
  } catch (err) {
    erros.push({ processoId: "(djen oab)", numero: "", erro: msg(err) });
  }

  // ------------------------------------------------ 2. Datajud (complemento)
  let processosAtivos = 0;
  let novasMovimentacoes = 0;
  let novasPublicacoes = 0;
  let verificados = 0;
  let datajudAtualizadoEm: Date | null = null;

  if (!simular) {
    // Prioritarios primeiro; depois quem nunca foi verificado (ou foi ha mais
    // tempo) — rodizio justo quando o tempo nao alcanca todos.
    const processos = await prisma.processo.findMany({
      where: { monitoramento: { monitoramentoAtivo: true } },
      select: { id: true, numero: true },
      orderBy: [
        { prioritario: "desc" },
        { monitoramento: { ultimaVerificacao: { sort: "asc", nulls: "first" } } },
      ],
    });
    processosAtivos = processos.length;

    // O Datajud leva de 9 a 30 s por consulta em horario ruim (medido em
    // 23/10/2026), mas responde consultas em paralelo: lotes de 5 processos.
    const LOTE = 5;
    for (let k = 0; k < processos.length; k += LOTE) {
      if (Date.now() - inicio > BUDGET_VERIFICACAO_MS) break;
      const lote = processos.slice(k, k + LOTE);
      verificados += lote.length;
      const resultados = await Promise.all(
        lote.map(async (p) => {
          try {
            // Uma unica consulta ao Datajud por processo: movimentacoes e
            // publicacoes derivadas saem do mesmo resultado.
            return { p, r: await verificarProcessoMonitorado(p.id), falha: null as string | null };
          } catch (err) {
            return { p, r: null, falha: msg(err) };
          }
        }),
      );
      for (const { p, r, falha } of resultados) {
        if (falha || !r) {
          erros.push({ processoId: p.id, numero: p.numero, erro: falha ?? "sem resultado" });
          continue;
        }
        novasMovimentacoes += r.novasMovimentacoes;
        novasPublicacoes += r.novasPublicacoes;
        if (r.erro) {
          erros.push({ processoId: p.id, numero: p.numero, erro: r.erro });
        }
        if (
          r.datajudAtualizadoEm &&
          (!datajudAtualizadoEm || r.datajudAtualizadoEm > datajudAtualizadoEm)
        ) {
          datajudAtualizadoEm = r.datajudAtualizadoEm;
        }
      }
    }
  }

  // ------------------------------------------------ 3. fila DJEN (inteiro teor)
  let djenFila = null;
  if (!simular) {
    try {
      djenFila = await processarFilaDjen({
        escritorioId: null,
        limite: 120,
        deadline: inicio + BUDGET_TOTAL_MS,
      });
    } catch (err) {
      erros.push({
        processoId: "(fila djen)",
        numero: "",
        erro: msg(err),
      });
    }
  }

  const duracaoMs = Date.now() - inicio;
  const resultado = {
    ok: true,
    timestamp: new Date().toISOString(),
    simulacao: simular,
    djenOab: djenOab && {
      janela: djenOab.janela,
      porOab: djenOab.porOab,
      comunicacoes: djenOab.comunicacoes,
      casaramComPainel: djenOab.casaram,
      gravadas: djenOab.gravadas,
      interrompidoPorTempo: djenOab.interrompidoPorTempo,
      noPainel: djenOab.noPainel,
      naoCasaram: djenOab.naoCasaram,
    },
    datajud: {
      processosAtivos,
      processosVerificados: verificados,
      processosPulados: processosAtivos - verificados,
      novasMovimentacoes,
      novasPublicacoes,
      atualizadoEmMaisRecente: datajudAtualizadoEm?.toISOString() ?? null,
    },
    // Campos antigos mantidos para quem le o log do cron.
    processosAtivos,
    processosVerificados: verificados,
    processosPulados: processosAtivos - verificados,
    novasMovimentacoes,
    novasPublicacoes,
    djenFila,
    duracaoMs,
    erros,
  };

  console.log("[cron monitoramento]", JSON.stringify(resultado));

  return NextResponse.json(resultado);
}
