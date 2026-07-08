import { NextResponse } from "next/server";

import { verificarNovasMovimentacoes } from "@/lib/datajud";
import { verificarNovasPublicacoes } from "@/lib/djen";
import { processarFilaDjen } from "@/lib/djen-fila";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Orcamento de tempo dentro do maxDuration de 300s: a verificacao de
// movimentacoes/publicacoes roda ate 210s, a fila DJEN ate 270s, e os 30s
// finais ficam de folga para gravar e responder. Processos nao verificados
// hoje entram primeiro amanha (ordenacao por ultimaVerificacao).
const BUDGET_VERIFICACAO_MS = 210_000;
const BUDGET_TOTAL_MS = 270_000;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  const ok =
    expected.length > 0 && auth === `Bearer ${expected}`;

  if (!ok) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const inicio = Date.now();
  // Quem nunca foi verificado (ou foi ha mais tempo) vem primeiro — rodizio
  // justo quando o tempo nao alcanca todos.
  const processos = await prisma.processo.findMany({
    where: { monitoramento: { monitoramentoAtivo: true } },
    select: { id: true, numero: true },
    orderBy: {
      monitoramento: { ultimaVerificacao: { sort: "asc", nulls: "first" } },
    },
  });

  let novasMovimentacoes = 0;
  let novasPublicacoes = 0;
  let verificados = 0;
  const erros: { processoId: string; numero: string; erro: string }[] = [];

  function msg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  for (const p of processos) {
    if (Date.now() - inicio > BUDGET_VERIFICACAO_MS) break;
    verificados++;
    try {
      novasMovimentacoes += await verificarNovasMovimentacoes(p.id);
    } catch (err) {
      erros.push({
        processoId: p.id,
        numero: p.numero,
        erro: `mov: ${msg(err)}`,
      });
    }
    try {
      novasPublicacoes += await verificarNovasPublicacoes(p.id);
    } catch (err) {
      erros.push({
        processoId: p.id,
        numero: p.numero,
        erro: `pub: ${msg(err)}`,
      });
    }
  }

  // Processa fila DJEN apos verificacao de novas mov/pub (movimentacoes
  // pendentes acumuladas + falhas anteriores entrando agora).
  let djenFila = null;
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

  const duracaoMs = Date.now() - inicio;
  const resultado = {
    ok: true,
    timestamp: new Date().toISOString(),
    processosAtivos: processos.length,
    processosVerificados: verificados,
    processosPulados: processos.length - verificados,
    novasMovimentacoes,
    novasPublicacoes,
    djenFila,
    duracaoMs,
    erros,
  };

  console.log("[cron monitoramento]", JSON.stringify(resultado));

  return NextResponse.json(resultado);
}
