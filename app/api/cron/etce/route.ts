import { NextResponse } from "next/server";

import { CATEGORIAS_MARCO, rodadaColeta } from "@/lib/etce-coletor";
import { analisarDeliberacoesPendentes } from "@/lib/etce-ia";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Coletor semanal do e-TCEPE (sabado; o judicial roda de seg a sex).
// Orcamento: leitura ate 230s, IA das deliberacoes novas ate 270s, 30s de folga.
const BUDGET_LEITURA_MS = 230_000;
const BUDGET_TOTAL_MS = 270_000;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!(expected.length > 0 && auth === `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  // ?simular=1 — le o e-TCEPE e mostra o que seria gravado, sem gravar nem chamar IA.
  const simular = new URL(req.url).searchParams.get("simular") === "1";
  const inicio = Date.now();

  const coleta = await rodadaColeta({
    gravar: !simular,
    deadline: inicio + BUDGET_LEITURA_MS,
    concorrencia: 4,
  });

  const ia = simular
    ? null
    : await analisarDeliberacoesPendentes({ gravar: true, deadline: inicio + BUDGET_TOTAL_MS });

  const novidades = coleta.resultados
    .filter((r) => !r.primeiraLeitura)
    .flatMap((r) => r.novos.filter((e) => CATEGORIAS_MARCO.has(e.categoria)))
    .map((e) => ({ processo: e.numeroBase, categoria: e.categoria, data: e.data, descricao: e.descricao }));

  const resultado = {
    ok: true,
    timestamp: new Date().toISOString(),
    simulacao: simular,
    alvos: coleta.alvos,
    lidos: coleta.lidos,
    naoLidosPorTempo: coleta.alvos - coleta.lidos - coleta.falhas.length,
    primeirasLeituras: coleta.resultados.filter((r) => r.primeiraLeitura).length,
    foraDoAr: coleta.foraDoAr,
    falhas: coleta.falhas,
    novidades,
    ia,
    duracaoMs: Date.now() - inicio,
  };
  console.log("[cron etce]", JSON.stringify(resultado));
  return NextResponse.json(resultado);
}
