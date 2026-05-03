import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prazoTceUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.prazoTce.findFirst({
    where: { id, processo: { escritorioId } },
    select: { id: true, tipo: true, processo: { select: { numero: true } } },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = prazoTceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.advogadoRespId) {
    const adv = await prisma.user.findFirst({
      where: {
        id: data.advogadoRespId,
        escritorioId: session.user.escritorioId,
      },
      select: { id: true },
    });
    if (!adv) {
      return NextResponse.json(
        { error: "Advogado responsavel nao encontrado" },
        { status: 400 },
      );
    }
  }

  await prisma.prazoTce.update({
    where: { id: params.id },
    data: {
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.dataIntimacao !== undefined && {
        dataIntimacao: data.dataIntimacao,
      }),
      ...(data.dataVencimento !== undefined && {
        dataVencimento: data.dataVencimento,
      }),
      ...(data.diasUteis !== undefined && { diasUteis: data.diasUteis }),
      ...(data.prorrogavel !== undefined && { prorrogavel: data.prorrogavel }),
      ...(data.prorrogacaoPedida !== undefined && {
        prorrogacaoPedida: data.prorrogacaoPedida,
      }),
      ...(data.dataProrrogacao !== undefined && {
        dataProrrogacao: data.dataProrrogacao,
      }),
      ...(data.cumprido !== undefined && { cumprido: data.cumprido }),
      ...(data.advogadoRespId !== undefined && {
        advogadoRespId: data.advogadoRespId,
      }),
      ...(data.observacoes !== undefined && {
        observacoes: data.observacoes || null,
      }),
    },
  });
  const acaoLog = data.cumprido === true ? ACOES.CUMPRIR_PRAZO_TCE : ACOES.EDITAR_PRAZO_TCE;
  const verbo = data.cumprido === true ? "cumpriu" : "editou";
  await registrarLog({
    userId: session.user.id,
    acao: acaoLog,
    entidade: "PrazoTce",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} ${verbo} prazo TCE "${existing.tipo}" do processo ${existing.processo.numero}`,
    detalhes: data,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await prisma.prazoTce.delete({ where: { id: params.id } });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EXCLUIR_PRAZO_TCE,
    entidade: "PrazoTce",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} excluiu prazo TCE "${existing.tipo}" do processo ${existing.processo.numero}`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
