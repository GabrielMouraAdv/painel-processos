import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Dispensa (e desfaz a dispensa) de prazos da planilha LIG, so no painel.
// A planilha nao e alterada: a dispensa guarda a linha como estava (ID, processo,
// prazo fatal) e deixa de valer se a triagem mudar esse prazo.

const dispensarSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(10),
  motivo: z.string().trim().min(3, "Informe o motivo").max(2000),
});
const desfazerSchema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const parsed = dispensarSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { ids, motivo } = parsed.data;

  const linhas = await prisma.prazoLig.findMany({
    where: { idPlanilha: { in: ids }, ativoNaPlanilha: true },
    select: { idPlanilha: true, numeroProcesso: true, peca: true, prazoFatalTexto: true },
  });
  if (linhas.length !== ids.length) {
    return NextResponse.json({ error: "Prazo nao encontrado na planilha sincronizada" }, { status: 404 });
  }

  const nome = session.user.name ?? session.user.email ?? "usuário";
  const criadas = await prisma.$transaction(
    linhas.map((l) =>
      prisma.dispensaPrazoLig.create({
        data: { ...l, motivo, usuarioId: session.user.id, usuarioNome: nome },
        select: { id: true, idPlanilha: true },
      }),
    ),
  );
  for (const l of linhas) {
    await registrarLog({
      userId: session.user.id,
      acao: ACOES.DISPENSAR_PRAZO,
      entidade: "PrazoLig",
      entidadeId: l.idPlanilha,
      descricao: `Dispensou ${l.idPlanilha} (${l.peca} · ${l.numeroProcesso} · fatal ${l.prazoFatalTexto}) na aba Agendamento de publicações`,
      detalhes: { motivo },
      ip: extrairIp(req),
    });
  }
  return NextResponse.json({ ok: true, criadas });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const parsed = desfazerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });

  const d = await prisma.dispensaPrazoLig.findFirst({ where: { id: parsed.data.id, desfeitaEm: null } });
  if (!d) return NextResponse.json({ error: "Dispensa nao encontrada" }, { status: 404 });

  const nome = session.user.name ?? session.user.email ?? "usuário";
  await prisma.dispensaPrazoLig.update({ where: { id: d.id }, data: { desfeitaEm: new Date(), desfeitaPorNome: nome } });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.DISPENSAR_PRAZO,
    entidade: "PrazoLig",
    entidadeId: d.idPlanilha,
    descricao: `Desfez a dispensa de ${d.idPlanilha} (${d.peca} · ${d.numeroProcesso}) na aba Agendamento de publicações`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
