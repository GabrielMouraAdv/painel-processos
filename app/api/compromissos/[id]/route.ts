import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import {
  podeUsarCategoriasPrivadas,
  podeVerCompromisso,
} from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { compromissoUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.compromisso.findFirst({
    where: { id, escritorioId },
    select: { id: true, titulo: true, privado: true, advogadoId: true },
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
  const escritorioId = session.user.escritorioId;
  const existing = await ensureOwned(params.id, escritorioId);
  if (
    !existing ||
    !podeVerCompromisso(
      { id: session.user.id, email: session.user.email },
      existing,
    )
  ) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = compromissoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.advogadoId) {
    const adv = await prisma.user.findFirst({
      where: { id: data.advogadoId, escritorioId },
      select: { id: true },
    });
    if (!adv) {
      return NextResponse.json(
        { error: "Advogado responsavel nao encontrado" },
        { status: 400 },
      );
    }
  }

  await prisma.compromisso.update({
    where: { id: params.id },
    data: {
      ...(data.titulo !== undefined && { titulo: data.titulo.trim() }),
      ...(data.descricao !== undefined && {
        descricao: data.descricao?.trim() || null,
      }),
      ...(data.dataInicio !== undefined && { dataInicio: data.dataInicio }),
      ...(data.dataFim !== undefined && { dataFim: data.dataFim }),
      ...(data.diaInteiro !== undefined && { diaInteiro: data.diaInteiro }),
      ...(data.cor !== undefined && { cor: data.cor }),
      ...(data.tipo !== undefined && { tipo: data.tipo }),
      ...(data.categoria !== undefined && {
        categoria:
          data.categoria !== "ESCRITORIO" &&
          !podeUsarCategoriasPrivadas({
            id: session.user.id,
            email: session.user.email,
          })
            ? "ESCRITORIO"
            : data.categoria,
        privado:
          data.categoria !== "ESCRITORIO" &&
          podeUsarCategoriasPrivadas({
            id: session.user.id,
            email: session.user.email,
          }),
      }),
      ...(data.local !== undefined && {
        local: data.local?.trim() || null,
      }),
      ...(data.advogadoId !== undefined && { advogadoId: data.advogadoId }),
      ...(data.processoTceId !== undefined && {
        processoTceId: data.processoTceId || null,
      }),
      ...(data.processoId !== undefined && {
        processoId: data.processoId || null,
      }),
      ...(data.cumprido !== undefined && { cumprido: data.cumprido }),
    },
  });

  const acao =
    data.cumprido === true
      ? ACOES.CUMPRIR_COMPROMISSO
      : ACOES.EDITAR_COMPROMISSO;
  const verbo = data.cumprido === true ? "marcou como cumprido" : "editou";
  const privadoFinal =
    data.categoria !== undefined
      ? data.categoria !== "ESCRITORIO" &&
        podeUsarCategoriasPrivadas({
          id: session.user.id,
          email: session.user.email,
        })
      : existing.privado;
  await registrarLog({
    userId: session.user.id,
    acao,
    entidade: "Compromisso",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} ${verbo} o compromisso "${existing.titulo}"`,
    detalhes: { ...data, privado: privadoFinal },
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
  if (
    !existing ||
    !podeVerCompromisso(
      { id: session.user.id, email: session.user.email },
      existing,
    )
  ) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  await prisma.compromisso.delete({ where: { id: params.id } });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EXCLUIR_COMPROMISSO,
    entidade: "Compromisso",
    entidadeId: params.id,
    descricao: `${session.user.name ?? "Usuario"} excluiu o compromisso "${existing.titulo}"`,
    detalhes: { privado: existing.privado },
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
