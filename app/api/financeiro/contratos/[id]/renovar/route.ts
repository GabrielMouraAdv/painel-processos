import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import {
  gerarNotasIncrementais,
  podeAcessarFinanceiro,
} from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { renovarContratoSchema } from "@/lib/schemas";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    if (
      !podeAcessarFinanceiro(session.user.role, session.user.bancaSlug ?? null)
    ) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }

    const contrato = await prisma.contratoMunicipal.findFirst({
      where: {
        id: params.id,
        municipio: { escritorioId: session.user.escritorioId },
      },
      select: {
        id: true,
        valorMensal: true,
        dataFim: true,
        dataRenovacao: true,
        notas: {
          orderBy: [{ anoReferencia: "desc" }, { mesReferencia: "desc" }],
          take: 1,
          select: { mesReferencia: true, anoReferencia: true },
        },
      },
    });
    if (!contrato) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body invalido" }, { status: 400 });
    }
    const parsed = renovarContratoSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.flatten();
      const primeiroErro =
        Object.values(issues.fieldErrors).flat()[0] ??
        issues.formErrors[0] ??
        "Dados invalidos";
      return NextResponse.json(
        { error: primeiroErro, issues },
        { status: 400 },
      );
    }
    const { novaDataFim, novoValorMensal, novaDataRenovacao } = parsed.data;

    // Validar: novaDataFim deve ser depois da dataFim atual (se houver)
    if (contrato.dataFim && novaDataFim.getTime() <= contrato.dataFim.getTime()) {
      return NextResponse.json(
        {
          error:
            "Nova data de fim deve ser posterior a data de fim atual do contrato",
        },
        { status: 400 },
      );
    }

    const valorAplicado =
      novoValorMensal !== undefined
        ? novoValorMensal
        : Number(contrato.valorMensal);

    // Atualiza contrato
    await prisma.contratoMunicipal.update({
      where: { id: contrato.id },
      data: {
        dataFim: novaDataFim,
        valorMensal: valorAplicado.toFixed(2),
        dataRenovacao: novaDataRenovacao ?? null,
      },
    });

    // Gera notas incrementais
    const ultimo = contrato.notas[0]
      ? {
          mes: contrato.notas[0].mesReferencia,
          ano: contrato.notas[0].anoReferencia,
        }
      : null;
    let notasGeradas = 0;
    try {
      const novasNotas = gerarNotasIncrementais(
        ultimo,
        novaDataFim,
        valorAplicado,
      );
      if (novasNotas.length > 0) {
        await prisma.notaFiscal.createMany({
          data: novasNotas.map((n) => ({
            contratoId: contrato.id,
            mesReferencia: n.mesReferencia,
            anoReferencia: n.anoReferencia,
            valorNota: n.valorNota.toFixed(2),
            dataVencimento: n.dataVencimento,
          })),
        });
        notasGeradas = novasNotas.length;
      }
    } catch (e) {
      console.error("[renovar contrato] erro ao gerar notas incrementais:", e);
    }

    await registrarLog({
      userId: session.user.id,
      acao: ACOES.RENOVAR_CONTRATO,
      entidade: "ContratoMunicipal",
      entidadeId: contrato.id,
      descricao: `${session.user.name ?? "Usuario"} renovou contrato municipal ate ${novaDataFim.toISOString().slice(0, 10)} - R$ ${valorAplicado.toFixed(2)}/mes`,
      detalhes: { novaDataFim, novoValorMensal: valorAplicado, novaDataRenovacao, notasGeradas },
      ip: extrairIp(req),
    });

    return NextResponse.json({ ok: true, notasGeradas });
  } catch (err) {
    console.error("[POST /api/financeiro/contratos/[id]/renovar] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
