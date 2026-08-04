import { NextResponse } from "next/server";

import { registrarLog } from "@/lib/audit-log";
import {
  criarPrazosRevisao,
  exigirSessaoEleitoral,
  prazoEleitoralUpdateSchema,
  sincronizarStatusPrazo,
} from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const existente = await prisma.prazoEleitoral.findFirst({
    where: {
      id: params.id,
      processo: { escritorioId: session.user.escritorioId },
    },
    select: { id: true, tarefa: true },
  });
  if (!existente) {
    return NextResponse.json(
      { error: "Prazo nao encontrado" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = prazoEleitoralUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const statusSync = sincronizarStatusPrazo({
    status: d.status,
    cumprido: d.cumprido,
  });

  const prazo = await prisma.prazoEleitoral.update({
    where: { id: existente.id },
    data: {
      ...(d.tarefa !== undefined ? { tarefa: d.tarefa } : {}),
      ...(d.data !== undefined ? { data: d.data } : {}),
      ...(d.hora !== undefined ? { hora: d.hora || null } : {}),
      ...(d.responsavelId !== undefined
        ? { responsavelId: d.responsavelId || null }
        : {}),
      ...(d.observacoes !== undefined
        ? { observacoes: d.observacoes || null }
        : {}),
      ...statusSync,
    },
  });

  // Peca enviada para revisao com revisores marcados: cada revisor ganha
  // automaticamente um prazo de revisao no mesmo processo.
  let revisoesCriadas = 0;
  if (prazo.status === "ENVIADO_REVISAO" && d.revisores?.length) {
    revisoesCriadas = await criarPrazosRevisao({
      processoId: prazo.processoId,
      tarefaBase: prazo.tarefa,
      data: prazo.data,
      hora: prazo.hora,
      revisores: d.revisores,
      escritorioId: session.user.escritorioId,
    });
  }

  await registrarLog({
    userId: session.user.id,
    acao: "EDITAR_PRAZO_ELEITORAL",
    entidade: "PrazoEleitoral",
    entidadeId: prazo.id,
    descricao:
      statusSync.status !== undefined
        ? `Prazo eleitoral (${existente.tarefa}) marcado como ${statusSync.status}${revisoesCriadas > 0 ? ` com ${revisoesCriadas} prazo(s) de revisao` : ""}`
        : d.data !== undefined
          ? `Moveu o prazo eleitoral (${existente.tarefa}) para ${d.data.toISOString().slice(0, 10)}`
          : `Editou prazo eleitoral (${existente.tarefa})`,
  });

  return NextResponse.json({ prazo, revisoesCriadas });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const existente = await prisma.prazoEleitoral.findFirst({
    where: {
      id: params.id,
      processo: { escritorioId: session.user.escritorioId },
    },
    select: { id: true, tarefa: true },
  });
  if (!existente) {
    return NextResponse.json(
      { error: "Prazo nao encontrado" },
      { status: 404 },
    );
  }

  await prisma.prazoEleitoral.delete({ where: { id: existente.id } });

  await registrarLog({
    userId: session.user.id,
    acao: "EXCLUIR_PRAZO_ELEITORAL",
    entidade: "PrazoEleitoral",
    entidadeId: existente.id,
    descricao: `Excluiu prazo eleitoral (${existente.tarefa})`,
  });

  return NextResponse.json({ ok: true });
}
