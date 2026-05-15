import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TipoHonorario } from "@prisma/client";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import {
  bancasVisiveisFinanceiro,
  podeAcessarFinanceiro,
} from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { honorarioPessoalInputSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    if (
      !podeAcessarFinanceiro(session.user.role, session.user.email ?? null)
    ) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }
    const url = new URL(req.url);
    const banca = url.searchParams.get("banca");
    const tipoParam = url.searchParams.get("tipo");
    const ano = url.searchParams.get("ano");
    const status = url.searchParams.get("status");

    const bancas = banca
      ? banca
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : [];
    const tipoVal = (Object.values(TipoHonorario) as string[]).includes(
      tipoParam ?? "",
    )
      ? (tipoParam as TipoHonorario)
      : undefined;

    // Recorte por banca do usuario logado (ADMIN ve tudo)
    const bancasUsuario = bancasVisiveisFinanceiro(
      session.user.role,
      session.user.bancaSlug ?? null,
    );
    if (bancasUsuario !== null && bancasUsuario.length === 0) {
      return NextResponse.json({ honorarios: [] });
    }
    const bancasEfetivas =
      bancasUsuario === null
        ? bancas
        : bancas.length > 0
          ? bancas.filter((b) => bancasUsuario.includes(b))
          : bancasUsuario;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const honorarios = await prisma.honorarioPessoal.findMany({
      where: {
        ...(bancasEfetivas.length > 0 && {
          bancasSlug: { hasSome: bancasEfetivas },
        }),
        ...(tipoVal && { tipoHonorario: tipoVal }),
        ...(ano && {
          dataContrato: {
            gte: new Date(Date.UTC(parseInt(ano, 10), 0, 1)),
            lt: new Date(Date.UTC(parseInt(ano, 10) + 1, 0, 1)),
          },
        }),
        ...(status === "pago" && { pago: true }),
        ...(status === "aberto" && { pago: false }),
        ...(status === "vencido" && {
          pago: false,
          dataVencimento: { lt: hoje },
        }),
      },
      orderBy: [{ dataContrato: "desc" }],
    });
    return NextResponse.json({ honorarios });
  } catch (err) {
    console.error("[GET /api/financeiro/honorarios-pessoais] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    if (
      !podeAcessarFinanceiro(session.user.role, session.user.email ?? null)
    ) {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body invalido" }, { status: 400 });
    }
    const parsed = honorarioPessoalInputSchema.safeParse(body);
    if (!parsed.success) {
      console.warn(
        "[POST honorarios-pessoais] validacao:",
        parsed.error.flatten(),
      );
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
    const created = await prisma.honorarioPessoal.create({
      data: {
        clienteNome: data.clienteNome,
        clienteCpf: data.clienteCpf ?? null,
        bancasSlug: data.bancasSlug,
        tipoHonorario: data.tipoHonorario,
        descricaoCausa: data.descricaoCausa,
        valorTotal: data.valorTotal.toFixed(2),
        dataContrato: data.dataContrato,
        dataVencimento: data.dataVencimento ?? null,
        pago: data.pago ?? false,
        dataPagamento: data.dataPagamento ?? null,
        valorPago: data.valorPago !== null && data.valorPago !== undefined
          ? data.valorPago.toFixed(2)
          : null,
        observacoes: data.observacoes ?? null,
      },
      select: { id: true },
    });
    await registrarLog({
      userId: session.user.id,
      acao: ACOES.CRIAR_HONORARIO,
      entidade: "HonorarioPessoal",
      entidadeId: created.id,
      descricao: `${session.user.name ?? "Usuario"} cadastrou honorario pessoal de ${data.clienteNome} - R$ ${data.valorTotal.toFixed(2)} (${data.tipoHonorario})`,
      detalhes: { clienteNome: data.clienteNome, tipoHonorario: data.tipoHonorario, valorTotal: data.valorTotal },
      ip: extrairIp(req),
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/financeiro/honorarios-pessoais] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
