import { NextResponse } from "next/server";

import { gerarAgendaHoje } from "@/lib/agenda";
import { ACOES, registrarLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { enviarMensagemTelegram, htmlEscape } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const usuarios = await prisma.user.findMany({
    where: {
      telegramAtivo: true,
      telegramReceberLembreteDiario: true,
    },
    select: { id: true, nome: true },
  });

  const resultados: { userId: string; ok: boolean; erro?: string }[] = [];

  for (const u of usuarios) {
    try {
      const corpo = await gerarAgendaHoje(u.id);
      const saudacao = `Bom dia, <b>${htmlEscape(u.nome)}</b>! ☀️\n\n`;
      const env = await enviarMensagemTelegram(u.id, saudacao + corpo);
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
        descricao: `Cron lembrete-manha disparou para ${u.nome}`,
        detalhes: { cron: "lembrete-manha", ok: env.ok, erro: env.error },
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
    cron: "lembrete-manha",
    enviados: resultados.filter((r) => r.ok).length,
    falhas: resultados.filter((r) => !r.ok).length,
    resultados,
  });
}
