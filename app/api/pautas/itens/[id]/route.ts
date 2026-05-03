import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { podeEditarPauta } from "@/lib/pauta-permissions";
import { prisma } from "@/lib/prisma";
import { itemPautaJudicialUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.itemPautaJudicial.findFirst({
    where: { id, sessao: { escritorioId } },
    select: { id: true, numeroProcesso: true },
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
  if (!podeEditarPauta(session.user.role)) {
    return NextResponse.json(
      { error: "Sem permissao para editar item" },
      { status: 403 },
    );
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = itemPautaJudicialUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.processoId) {
    const proc = await prisma.processo.findFirst({
      where: {
        id: data.processoId,
        escritorioId: session.user.escritorioId,
      },
      select: { id: true },
    });
    if (!proc) {
      return NextResponse.json(
        { error: "Processo nao encontrado" },
        { status: 400 },
      );
    }
  }

  await prisma.itemPautaJudicial.update({
    where: { id: params.id },
    data: {
      ...(data.numeroProcesso !== undefined && {
        numeroProcesso: data.numeroProcesso,
      }),
      ...(data.tituloProcesso !== undefined && {
        tituloProcesso: data.tituloProcesso || null,
      }),
      ...(data.tipoRecurso !== undefined && {
        tipoRecurso: data.tipoRecurso || null,
      }),
      ...(data.partes !== undefined && { partes: data.partes || null }),
      ...(data.relator !== undefined && { relator: data.relator }),
      ...(data.advogadoResp !== undefined && {
        advogadoResp: data.advogadoResp,
      }),
      ...(data.situacao !== undefined && {
        situacao: data.situacao || null,
      }),
      ...(data.prognostico !== undefined && {
        prognostico: data.prognostico || null,
      }),
      ...(data.observacoes !== undefined && {
        observacoes: data.observacoes || null,
      }),
      ...(data.providencia !== undefined && {
        providencia: data.providencia || null,
      }),
      ...(data.sustentacaoOral !== undefined && {
        sustentacaoOral: data.sustentacaoOral,
      }),
      ...(data.advogadoSustentacao !== undefined && {
        advogadoSustentacao: data.advogadoSustentacao || null,
      }),
      ...(data.sessaoVirtual !== undefined && {
        sessaoVirtual: data.sessaoVirtual,
      }),
      ...(data.pedidoRetPresencial !== undefined && {
        pedidoRetPresencial: data.pedidoRetPresencial,
      }),
      ...(data.retiradoDePauta !== undefined && {
        retiradoDePauta: data.retiradoDePauta,
      }),
      ...(data.pedidoVistas !== undefined && {
        pedidoVistas: data.pedidoVistas,
      }),
      ...(data.desPedidoVistas !== undefined && {
        desPedidoVistas: data.desPedidoVistas || null,
      }),
      ...(data.parecerMpf !== undefined && {
        parecerMpf: data.parecerMpf,
      }),
      ...(data.processoId !== undefined && {
        processoId: data.processoId || null,
      }),
      ...(data.ordem !== undefined && { ordem: data.ordem }),
    },
  });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EDITAR_ITEM_PAUTA,
    entidade: "ItemPautaJudicial",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} editou item ${existing.numeroProcesso} da pauta judicial`,
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
  if (!podeEditarPauta(session.user.role)) {
    return NextResponse.json(
      { error: "Sem permissao para excluir item" },
      { status: 403 },
    );
  }
  const existing = await ensureOwned(params.id, session.user.escritorioId);
  if (!existing)
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  await prisma.itemPautaJudicial.delete({ where: { id: params.id } });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EXCLUIR_ITEM_PAUTA,
    entidade: "ItemPautaJudicial",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} excluiu item ${existing.numeroProcesso} da pauta judicial`,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
