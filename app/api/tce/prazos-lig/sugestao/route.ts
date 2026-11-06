import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Sugestao de agendamento de um prazo da planilha LIG, so no painel. A sugestao
// nova substitui a anterior da mesma linha; DELETE desfaz a vigente.

const sugerirSchema = z.object({
  id: z.string().min(1),
  agendamento: z.string().trim().min(2, "Escolha o agendamento").max(500),
  prazo: z.string().trim().min(1, "Escolha o prazo").max(200),
  dataAgenda: z.string().trim().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Escolha a data para a agenda"),
});
const desfazerSchema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = sugerirSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dados inválidos";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { id, agendamento, prazo, dataAgenda } = parsed.data;

  const linha = await prisma.prazoLig.findFirst({
    where: { idPlanilha: id, ativoNaPlanilha: true },
    select: { idPlanilha: true, numeroProcesso: true, prazoFatalTexto: true, peca: true },
  });
  if (!linha) return NextResponse.json({ error: "Prazo não encontrado na planilha sincronizada" }, { status: 404 });

  const nome = session.user.name ?? session.user.email ?? "usuário";
  const agora = new Date();
  const [, criada] = await prisma.$transaction([
    prisma.sugestaoAgendamentoLig.updateMany({ where: { idPlanilha: id, substituidaEm: null }, data: { substituidaEm: agora } }),
    prisma.sugestaoAgendamentoLig.create({
      data: {
        idPlanilha: linha.idPlanilha, numeroProcesso: linha.numeroProcesso, prazoFatalTexto: linha.prazoFatalTexto,
        agendamento, prazo, dataAgenda, usuarioId: session.user.id, usuarioNome: nome,
      },
      select: { id: true },
    }),
  ]);
  await registrarLog({
    userId: session.user.id,
    acao: "SUGERIR_AGENDAMENTO",
    entidade: "PrazoLig",
    entidadeId: id,
    descricao: `Sugeriu agendamento para ${id} (${linha.numeroProcesso}): ${agendamento} · ${prazo} · ${dataAgenda}`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true, id: criada.id });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = desfazerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const s = await prisma.sugestaoAgendamentoLig.findFirst({ where: { id: parsed.data.id, substituidaEm: null } });
  if (!s) return NextResponse.json({ error: "Sugestão não encontrada" }, { status: 404 });

  await prisma.sugestaoAgendamentoLig.update({ where: { id: s.id }, data: { substituidaEm: new Date() } });
  await registrarLog({
    userId: session.user.id,
    acao: "SUGERIR_AGENDAMENTO",
    entidade: "PrazoLig",
    entidadeId: s.idPlanilha,
    descricao: `Desfez a sugestão de agendamento de ${s.idPlanilha} (${s.numeroProcesso})`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
