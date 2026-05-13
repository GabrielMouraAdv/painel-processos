import { NextResponse } from "next/server";

import { gerarAgendaAmanha } from "@/lib/agenda";
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

  const amanhaInicio = startOfDay(new Date(Date.now() + 86_400_000));
  const amanhaFim = endOfDay(amanhaInicio);

  const usuarios = await prisma.user.findMany({
    where: { telegramAtivo: true },
    select: {
      id: true,
      nome: true,
      escritorioId: true,
    },
  });

  const resultados: { userId: string; ok: boolean; erro?: string }[] = [];

  for (const u of usuarios) {
    try {
      // So envia se tiver algo amanha (compromisso ou prazo) para evitar spam.
      const [comp, pTce, pJud] = await Promise.all([
        prisma.compromisso.count({
          where: {
            advogadoId: u.id,
            escritorioId: u.escritorioId,
            cumprido: false,
            dataInicio: { gte: amanhaInicio, lte: amanhaFim },
          },
        }),
        prisma.prazoTce.count({
          where: {
            advogadoRespId: u.id,
            cumprido: false,
            dispensado: false,
            dataVencimento: { gte: amanhaInicio, lte: amanhaFim },
            processo: { escritorioId: u.escritorioId },
          },
        }),
        prisma.prazo.count({
          where: {
            advogadoRespId: u.id,
            cumprido: false,
            dispensado: false,
            data: { gte: amanhaInicio, lte: amanhaFim },
            processo: { escritorioId: u.escritorioId },
          },
        }),
      ]);

      if (comp + pTce + pJud === 0) {
        resultados.push({ userId: u.id, ok: true });
        continue;
      }

      const corpo = await gerarAgendaAmanha(u.id);
      const aviso = `⚠️ <b>${htmlEscape(u.nome)}</b>, voce tem ${comp + pTce + pJud} item(ns) para amanha:\n\n`;
      const env = await enviarMensagemTelegram(u.id, aviso + corpo);
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
        descricao: `Cron lembrete-tarde disparou para ${u.nome}`,
        detalhes: {
          cron: "lembrete-tarde",
          itens: comp + pTce + pJud,
          ok: env.ok,
        },
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
    cron: "lembrete-tarde",
    enviados: resultados.filter((r) => r.ok).length,
    falhas: resultados.filter((r) => !r.ok).length,
  });
}
