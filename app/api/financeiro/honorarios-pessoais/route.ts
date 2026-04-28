import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TipoHonorario } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { honorarioPessoalInputSchema } from "@/lib/schemas";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (
    !podeAcessarFinanceiro(session.user.role, session.user.bancaSlug ?? null)
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

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const honorarios = await prisma.honorarioPessoal.findMany({
    where: {
      ...(bancas.length > 0 && { bancasSlug: { hasSome: bancas } }),
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
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  if (
    !podeAcessarFinanceiro(session.user.role, session.user.bancaSlug ?? null)
  ) {
    return NextResponse.json({ error: "Sem permissao" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = honorarioPessoalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
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
      valorTotal: data.valorTotal,
      dataContrato: data.dataContrato,
      dataVencimento: data.dataVencimento ?? null,
      pago: data.pago ?? false,
      dataPagamento: data.dataPagamento ?? null,
      valorPago: data.valorPago ?? null,
      observacoes: data.observacoes ?? null,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
