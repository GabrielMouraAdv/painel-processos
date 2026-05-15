import { NextResponse } from "next/server";

import { processarFilaDjen } from "@/lib/djen-fila";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Endpoint dedicado para processar a fila DJEN. Pode ser disparado manualmente
 * (header `Authorization: Bearer <CRON_SECRET>`) por integracoes externas.
 *
 * No deploy atual, a fila tambem e processada inline pelos endpoints:
 *   - /api/monitoramento/verificar  (clique do usuario em "Verificar Agora")
 *   - /api/cron/monitoramento       (cron diario do Vercel)
 */
const LIMITE_POR_EXECUCAO = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  const ok = expected.length > 0 && auth === `Bearer ${expected}`;
  if (!ok) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const resultado = await processarFilaDjen({
    escritorioId: null,
    limite: LIMITE_POR_EXECUCAO,
  });
  console.log("[cron djen-fila]", JSON.stringify(resultado));
  return NextResponse.json({ ok: true, ...resultado });
}
