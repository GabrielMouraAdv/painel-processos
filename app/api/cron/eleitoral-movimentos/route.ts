import { NextResponse } from "next/server";

import { sincronizarMovimentosEleitoral } from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Folga para gravar e responder antes do maxDuration.
const DEADLINE_MS = 100_000;

/**
 * Cron diario: atualiza os movimentos (Datajud TRE-PE) de todos os
 * processos eleitorais em tramitacao. Processos consultados ha mais
 * tempo vem primeiro — rodizio justo se o tempo nao alcancar todos.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  const ok = expected.length > 0 && auth === `Bearer ${expected}`;
  if (!ok) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const inicio = Date.now();
  const processos = await prisma.processoEleitoral.findMany({
    where: { status: "EM_TRAMITACAO" },
    select: { id: true, numero: true },
    orderBy: { ultimaConsultaDatajud: { sort: "asc", nulls: "first" } },
  });

  let verificados = 0;
  let novosMovimentos = 0;
  const erros: string[] = [];

  for (const p of processos) {
    if (Date.now() - inicio > DEADLINE_MS) break;
    try {
      const r = await sincronizarMovimentosEleitoral(p.id);
      verificados += 1;
      novosMovimentos += r.novos;
      if (r.erro) erros.push(`${p.numero}: ${r.erro}`);
    } catch (err) {
      erros.push(`${p.numero}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    total: processos.length,
    verificados,
    novosMovimentos,
    erros,
  });
}
