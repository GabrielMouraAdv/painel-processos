import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { registrarLog } from "@/lib/audit-log";
import {
  exigirSessaoEleitoral,
  processoEleitoralCreateSchema,
  sincronizarMovimentosEleitoral,
} from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const processos = await prisma.processoEleitoral.findMany({
    where: { escritorioId },
    orderBy: { createdAt: "desc" },
    include: {
      coordenador: { select: { id: true, nome: true } },
      advogadoResp: { select: { id: true, nome: true } },
      prazos: {
        where: { cumprido: false },
        orderBy: { data: "asc" },
        take: 1,
        include: { responsavel: { select: { id: true, nome: true } } },
      },
      movimentos: { orderBy: { dataHora: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({ processos });
}

export async function POST(req: Request) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = processoEleitoralCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const processo = await prisma.processoEleitoral.create({
      data: {
        numero: data.numero,
        classe: data.classe,
        apelido: data.apelido || null,
        parteAutora: data.parteAutora,
        parteRe: data.parteRe,
        polo: data.polo,
        objeto: data.objeto,
        relator: data.relator || null,
        coordenadorId: data.coordenadorId || null,
        advogadoRespId: data.advogadoRespId || null,
        observacoes: data.observacoes || null,
        escritorioId,
      },
    });

    // Cadastro vindo da triagem do monitoramento: fecha a deteccao.
    if (data.deteccaoId) {
      await prisma.deteccaoEleitoral.updateMany({
        where: { id: data.deteccaoId, escritorioId },
        data: {
          status: "CADASTRADO",
          processoId: processo.id,
          resolvidoPorId: session.user.id,
          resolvidoEm: new Date(),
        },
      });
    }

    await registrarLog({
      userId: session.user.id,
      acao: "CRIAR_PROCESSO_ELEITORAL",
      entidade: "ProcessoEleitoral",
      entidadeId: processo.id,
      descricao: `Cadastrou processo eleitoral ${processo.numero}`,
    });

    // Primeira carga de movimentos via Datajud — melhor esforco, nao
    // bloqueia o cadastro se o Datajud estiver fora.
    let movimentos = { novos: 0, total: 0 } as Awaited<
      ReturnType<typeof sincronizarMovimentosEleitoral>
    >;
    try {
      movimentos = await sincronizarMovimentosEleitoral(processo.id);
    } catch {
      // silencioso: o botao "Atualizar movimentos" cobre depois
    }

    return NextResponse.json({ processo, movimentos }, { status: 201 });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ja existe um processo cadastrado com esse numero." },
        { status: 409 },
      );
    }
    throw err;
  }
}
