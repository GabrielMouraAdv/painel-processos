import { NextResponse } from "next/server";

import { ACOES, registrarLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { enviarMensagemTelegram, htmlEscape } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const hojeInicio = startOfDay(new Date());
  const hojeFim = endOfDay(hojeInicio);

  const usuarios = await prisma.user.findMany({
    where: { telegramAtivo: true },
    select: { id: true, nome: true, escritorioId: true },
  });

  const resultados: { userId: string; ok: boolean; erro?: string }[] = [];

  for (const u of usuarios) {
    try {
      const [prazosTce, prazosJud] = await Promise.all([
        prisma.prazoTce.findMany({
          where: {
            advogadoRespId: u.id,
            cumprido: false,
            dispensado: false,
            dataVencimento: { gte: hojeInicio, lte: hojeFim },
            processo: { escritorioId: u.escritorioId },
          },
          select: {
            tipo: true,
            processo: { select: { numero: true } },
          },
        }),
        prisma.prazo.findMany({
          where: {
            advogadoRespId: u.id,
            cumprido: false,
            dispensado: false,
            data: { gte: hojeInicio, lte: hojeFim },
            processo: { escritorioId: u.escritorioId },
          },
          select: {
            tipo: true,
            processo: { select: { numero: true } },
          },
        }),
      ]);

      const total = prazosTce.length + prazosJud.length;
      if (total === 0) {
        resultados.push({ userId: u.id, ok: true });
        continue;
      }

      const linhasTce = prazosTce.map(
        (p) =>
          `• <b>${htmlEscape(p.tipo)}</b> — Proc. ${htmlEscape(p.processo.numero)} (TCE)`,
      );
      const linhasJud = prazosJud.map(
        (p) =>
          `• <b>${htmlEscape(p.tipo)}</b> — Proc. ${htmlEscape(p.processo.numero)} (Judicial)`,
      );
      const msg =
        `⚠️ <b>URGENTE — ${htmlEscape(u.nome)}</b>\n` +
        `Voce tem ${total} prazo(s) vencendo HOJE:\n\n` +
        [...linhasTce, ...linhasJud].join("\n");

      const env = await enviarMensagemTelegram(u.id, msg);
      resultados.push({
        userId: u.id,
        ok: env.ok,
        erro: env.ok ? undefined : env.error,
      });
      await registrarLog({
        userId: u.id,
        acao: ACOES.CRON_TELEGRAM,
        entidade: "User",
        entidadeId: u.id,
        descricao: `Cron prazo-urgente disparou para ${u.nome} (${total} prazo(s) hoje)`,
        detalhes: { cron: "prazo-urgente", total, ok: env.ok },
      });
    } catch (err) {
      resultados.push({
        userId: u.id,
        ok: false,
        erro: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    cron: "prazo-urgente",
    enviados: resultados.filter((r) => r.ok).length,
    falhas: resultados.filter((r) => !r.ok).length,
  });
}
