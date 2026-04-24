import { NextResponse } from "next/server";

import { verificarNovasMovimentacoes } from "@/lib/datajud";
import { verificarNovasPublicacoes } from "@/lib/djen";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  const ok =
    expected.length > 0 && auth === `Bearer ${expected}`;

  if (!ok) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const inicio = Date.now();
  const processos = await prisma.processo.findMany({
    where: { monitoramento: { monitoramentoAtivo: true } },
    select: { id: true, numero: true },
  });

  let novasMovimentacoes = 0;
  let novasPublicacoes = 0;
  const erros: { processoId: string; numero: string; erro: string }[] = [];

  function msg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  for (const p of processos) {
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

  const duracaoMs = Date.now() - inicio;
  const resultado = {
    ok: true,
    timestamp: new Date().toISOString(),
    processosVerificados: processos.length,
    novasMovimentacoes,
    novasPublicacoes,
    duracaoMs,
    erros,
  };

  console.log("[cron monitoramento]", JSON.stringify(resultado));

  return NextResponse.json(resultado);
}
