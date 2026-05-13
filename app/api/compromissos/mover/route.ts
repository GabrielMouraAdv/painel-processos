import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { podeVerCompromisso } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { compromissoMoverSchema } from "@/lib/schemas";

function ymd(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function preservaHora(antiga: Date, nova: Date): Date {
  const r = new Date(nova);
  r.setHours(
    antiga.getHours(),
    antiga.getMinutes(),
    antiga.getSeconds(),
    antiga.getMilliseconds(),
  );
  return r;
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;
  const body = await req.json().catch(() => null);
  const parsed = compromissoMoverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { id, origem, novaData } = parsed.data;

  if (origem === "compromisso") {
    const c = await prisma.compromisso.findFirst({
      where: { id, escritorioId },
      select: {
        id: true,
        titulo: true,
        dataInicio: true,
        dataFim: true,
        privado: true,
        advogadoId: true,
      },
    });
    if (
      !c ||
      !podeVerCompromisso(
        { id: session.user.id, email: session.user.email },
        c,
      )
    ) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }
    const novaInicio = preservaHora(c.dataInicio, novaData);
    let novaFim = c.dataFim;
    if (c.dataFim) {
      const delta =
        novaInicio.getTime() - c.dataInicio.getTime();
      novaFim = new Date(c.dataFim.getTime() + delta);
    }
    await prisma.compromisso.update({
      where: { id },
      data: { dataInicio: novaInicio, dataFim: novaFim },
    });
    await registrarLog({
      userId: session.user.id,
      acao: ACOES.MOVER_COMPROMISSO,
      entidade: "Compromisso",
      entidadeId: id,
      descricao: `${session.user.name ?? "Usuario"} moveu o compromisso "${c.titulo}" de ${ymd(c.dataInicio)} para ${ymd(novaInicio)}`,
      detalhes: { privado: c.privado },
      ip: extrairIp(req),
    });
    return NextResponse.json({ ok: true });
  }

  if (origem === "prazoTce") {
    const p = await prisma.prazoTce.findFirst({
      where: { id, processo: { escritorioId } },
      select: {
        id: true,
        tipo: true,
        dataVencimento: true,
        processo: { select: { numero: true } },
      },
    });
    if (!p) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }
    const nova = preservaHora(p.dataVencimento, novaData);
    await prisma.prazoTce.update({
      where: { id },
      data: { dataVencimento: nova },
    });
    await registrarLog({
      userId: session.user.id,
      acao: ACOES.MOVER_COMPROMISSO,
      entidade: "PrazoTce",
      entidadeId: id,
      descricao: `${session.user.name ?? "Usuario"} moveu o prazo TCE "${p.tipo}" do processo ${p.processo.numero} de ${ymd(p.dataVencimento)} para ${ymd(nova)}`,
      ip: extrairIp(req),
    });
    return NextResponse.json({ ok: true });
  }

  // prazoJudicial
  const p = await prisma.prazo.findFirst({
    where: { id, processo: { escritorioId } },
    select: {
      id: true,
      tipo: true,
      data: true,
      processo: { select: { numero: true } },
    },
  });
  if (!p) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }
  const nova = preservaHora(p.data, novaData);
  await prisma.prazo.update({
    where: { id },
    data: { data: nova },
  });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.MOVER_COMPROMISSO,
    entidade: "Prazo",
    entidadeId: id,
    descricao: `${session.user.name ?? "Usuario"} moveu o prazo "${p.tipo}" do processo ${p.processo.numero} de ${ymd(p.data)} para ${ymd(nova)}`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
