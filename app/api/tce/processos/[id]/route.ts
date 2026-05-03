import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processoTceUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.processoTce.findFirst({
    where: { id, escritorioId },
    select: {
      id: true,
      numero: true,
      notaTecnica: true,
      parecerMpco: true,
      memorialPronto: true,
      memorialDispensado: true,
      despachadoComRelator: true,
      despachoDispensado: true,
      julgado: true,
    },
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
  const parsed = processoTceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  await prisma.processoTce.update({
    where: { id: params.id },
    data: {
      ...(data.numero !== undefined && { numero: data.numero }),
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.municipioId !== undefined && {
        municipioId: data.municipioId || null,
      }),
      ...(data.relator !== undefined && { relator: data.relator || null }),
      ...(data.camara !== undefined && { camara: data.camara }),
      ...(data.faseAtual !== undefined && { faseAtual: data.faseAtual }),
      ...(data.conselheiroSubstituto !== undefined && {
        conselheiroSubstituto: data.conselheiroSubstituto || null,
      }),
      ...(data.notaTecnica !== undefined && { notaTecnica: data.notaTecnica }),
      ...(data.parecerMpco !== undefined && { parecerMpco: data.parecerMpco }),
      ...(data.despachadoComRelator !== undefined && {
        despachadoComRelator: data.despachadoComRelator,
      }),
      ...(data.memorialPronto !== undefined && {
        memorialPronto: data.memorialPronto,
      }),
      ...(data.exercicio !== undefined && {
        exercicio: data.exercicio || null,
      }),
      ...(data.valorAutuado !== undefined && {
        valorAutuado: data.valorAutuado,
      }),
      ...(data.objeto !== undefined && { objeto: data.objeto }),
      ...(data.dataAutuacao !== undefined && {
        dataAutuacao: data.dataAutuacao,
      }),
      ...(data.dataIntimacao !== undefined && {
        dataIntimacao: data.dataIntimacao,
      }),
    },
  });

  const nome = session.user.name ?? "Usuario";
  const num = existing.numero;
  if (data.notaTecnica === true && !existing.notaTecnica) {
    await registrarLog({ userId: session.user.id, acao: ACOES.MARCAR_NT, entidade: "ProcessoTce", entidadeId: params.id, descricao: `${nome} marcou Nota Tecnica no processo ${num}`, ip: extrairIp(req) });
  }
  if (data.parecerMpco === true && !existing.parecerMpco) {
    await registrarLog({ userId: session.user.id, acao: ACOES.MARCAR_PARECER_MPCO, entidade: "ProcessoTce", entidadeId: params.id, descricao: `${nome} marcou Parecer MPCO no processo ${num}`, ip: extrairIp(req) });
  }
  if (data.memorialPronto === true && !existing.memorialPronto) {
    await registrarLog({ userId: session.user.id, acao: ACOES.MARCAR_MEMORIAL_PRONTO, entidade: "ProcessoTce", entidadeId: params.id, descricao: `${nome} marcou memorial pronto no processo ${num}`, ip: extrairIp(req) });
  }
  if (data.despachadoComRelator === true && !existing.despachadoComRelator) {
    await registrarLog({ userId: session.user.id, acao: ACOES.MARCAR_DESPACHADO, entidade: "ProcessoTce", entidadeId: params.id, descricao: `${nome} marcou despachado com relator no processo ${num}`, ip: extrairIp(req) });
  }
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EDITAR_PROCESSO_TCE,
    entidade: "ProcessoTce",
    entidadeId: params.id,
    descricao: `${nome} editou processo TCE ${num}`,
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

  await prisma.processoTce.delete({ where: { id: params.id } });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EXCLUIR_PROCESSO_TCE,
    entidade: "ProcessoTce",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} excluiu processo TCE ${existing.numero}`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
