import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { diaDe } from "@/lib/datas";
import { prisma } from "@/lib/prisma";
import { andamentoTceUpdateSchema } from "@/lib/schemas";

// Editar e excluir andamento TCE. Nao altera a fase atual do processo.
// Toda alteracao fica no Log de Auditoria com o valor anterior.

async function carregar(id: string, escritorioId: string) {
  return prisma.andamentoTce.findFirst({
    where: { id, processo: { escritorioId } },
    select: {
      id: true,
      data: true,
      fase: true,
      descricao: true,
      processo: { select: { numero: true } },
    },
  });
}

async function autorizado() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { erro: NextResponse.json({ error: "Nao autenticado" }, { status: 401 }) };
  }
  const role = session.user.role as Role;
  if (role !== Role.ADMIN && role !== Role.ADVOGADO) {
    return { erro: NextResponse.json({ error: "Sem permissao" }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await autorizado();
  if ("erro" in auth) return auth.erro;
  const { session } = auth;

  const atual = await carregar(params.id, session.user.escritorioId);
  if (!atual) return NextResponse.json({ error: "Andamento nao encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = andamentoTceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const atualizado = await prisma.andamentoTce.update({
    where: { id: atual.id },
    data: {
      ...(data.data !== undefined && { data: data.data }),
      ...(data.fase !== undefined && { fase: data.fase }),
      ...(data.descricao !== undefined && { descricao: data.descricao }),
    },
    select: { id: true, data: true, fase: true, descricao: true },
  });

  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EDITAR_ANDAMENTO_TCE,
    entidade: "AndamentoTce",
    entidadeId: atual.id,
    descricao: `${session.user.name ?? "Usuario"} editou andamento TCE do processo ${atual.processo.numero} (${diaDe(atual.data)}, ${atual.fase})`,
    detalhes: {
      antes: { data: atual.data.toISOString(), fase: atual.fase, descricao: atual.descricao },
      depois: { data: atualizado.data.toISOString(), fase: atualizado.fase, descricao: atualizado.descricao },
    },
    ip: extrairIp(req),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await autorizado();
  if ("erro" in auth) return auth.erro;
  const { session } = auth;

  const atual = await carregar(params.id, session.user.escritorioId);
  if (!atual) return NextResponse.json({ error: "Andamento nao encontrado" }, { status: 404 });

  await prisma.andamentoTce.delete({ where: { id: atual.id } });

  await registrarLog({
    userId: session.user.id,
    acao: ACOES.EXCLUIR_ANDAMENTO_TCE,
    entidade: "AndamentoTce",
    entidadeId: atual.id,
    descricao: `${session.user.name ?? "Usuario"} excluiu andamento TCE do processo ${atual.processo.numero} (${diaDe(atual.data)}, ${atual.fase})`,
    detalhes: { excluido: { data: atual.data.toISOString(), fase: atual.fase, descricao: atual.descricao } },
    ip: extrairIp(req),
  });

  return NextResponse.json({ ok: true });
}
