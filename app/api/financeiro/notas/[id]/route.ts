import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { notaFiscalUpdateSchema } from "@/lib/schemas";

async function ensureOwned(id: string, escritorioId: string) {
  return prisma.notaFiscal.findFirst({
    where: { id, contrato: { municipio: { escritorioId } } },
    select: {
      id: true,
      numeroNota: true,
      pago: true,
      mesReferencia: true,
      anoReferencia: true,
    },
  });
}

export async function PATCH(
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
    const exists = await ensureOwned(params.id, session.user.escritorioId);
    if (!exists) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body invalido" }, { status: 400 });
    }
    const parsed = notaFiscalUpdateSchema.safeParse(body);
    if (!parsed.success) {
      console.warn("[PATCH notas/[id]] validacao:", parsed.error.flatten());
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
    const data = parsed.data;
    await prisma.notaFiscal.update({
      where: { id: params.id },
      data: {
        ...(data.numeroNota !== undefined && { numeroNota: data.numeroNota }),
        ...(data.dataEmissao !== undefined && { dataEmissao: data.dataEmissao }),
        ...(data.mesReferencia !== undefined && {
          mesReferencia: data.mesReferencia,
        }),
        ...(data.anoReferencia !== undefined && {
          anoReferencia: data.anoReferencia,
        }),
        ...(data.valorNota !== undefined && {
          valorNota: data.valorNota.toFixed(2),
        }),
        ...(data.dataVencimento !== undefined && {
          dataVencimento: data.dataVencimento,
        }),
        ...(data.pago !== undefined && { pago: data.pago }),
        ...(data.dataPagamento !== undefined && {
          dataPagamento: data.dataPagamento,
        }),
        ...(data.valorPago !== undefined && {
          valorPago:
            data.valorPago !== null ? data.valorPago.toFixed(2) : null,
        }),
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      },
    });
    const refStr = `${String(exists.mesReferencia).padStart(2, "0")}/${exists.anoReferencia}`;
    if (data.pago === true && !exists.pago) {
      await registrarLog({
        userId: session.user.id,
        acao: ACOES.MARCAR_NOTA_PAGA,
        entidade: "NotaFiscal",
        entidadeId: params.id,
        descricao: `${session.user.name ?? "Usuario"} marcou nota fiscal${exists.numeroNota ? ` ${exists.numeroNota}` : ` ref ${refStr}`} como paga${data.dataPagamento ? ` em ${new Date(data.dataPagamento).toLocaleDateString("pt-BR")}` : ""}`,
        detalhes: { dataPagamento: data.dataPagamento, valorPago: data.valorPago },
        ip: extrairIp(req),
      });
    } else {
      await registrarLog({
        userId: session.user.id,
        acao: ACOES.EDITAR_NOTA_FISCAL,
        entidade: "NotaFiscal",
        entidadeId: params.id,
        descricao: `${session.user.name ?? "Usuario"} editou nota fiscal${exists.numeroNota ? ` ${exists.numeroNota}` : ` ref ${refStr}`}`,
        detalhes: data,
        ip: extrairIp(req),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/financeiro/notas/[id]] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    const exists = await ensureOwned(params.id, session.user.escritorioId);
    if (!exists) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }
    await prisma.notaFiscal.delete({ where: { id: params.id } });
    const refStr = `${String(exists.mesReferencia).padStart(2, "0")}/${exists.anoReferencia}`;
    await registrarLog({
      userId: session.user.id,
      acao: ACOES.EXCLUIR_NOTA_FISCAL,
      entidade: "NotaFiscal",
      entidadeId: params.id,
      descricao: `${session.user.name ?? "Usuario"} excluiu nota fiscal${exists.numeroNota ? ` ${exists.numeroNota}` : ` ref ${refStr}`}`,
      ip: extrairIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/financeiro/notas/[id]] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
