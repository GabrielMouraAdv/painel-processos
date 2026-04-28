import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { gerarNotasDoContrato, podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { contratoMunicipalInputSchema } from "@/lib/schemas";

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
  const municipioId = url.searchParams.get("municipioId");
  const ativo = url.searchParams.get("ativo");
  const banca = url.searchParams.get("banca");
  const bancas = banca
    ? banca
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const contratos = await prisma.contratoMunicipal.findMany({
    where: {
      municipio: { escritorioId: session.user.escritorioId },
      ...(municipioId && { municipioId }),
      ...(ativo === "true" && { ativo: true }),
      ...(ativo === "false" && { ativo: false }),
      ...(bancas.length > 0 && { bancasSlug: { hasSome: bancas } }),
    },
    orderBy: [{ ativo: "desc" }, { createdAt: "desc" }],
    include: {
      municipio: { select: { id: true, nome: true, uf: true } },
      _count: { select: { notas: true } },
    },
  });
  return NextResponse.json({ contratos });
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
  const parsed = contratoMunicipalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Verifica ownership do municipio
  const m = await prisma.municipio.findFirst({
    where: {
      id: data.municipioId,
      escritorioId: session.user.escritorioId,
    },
    select: { id: true },
  });
  if (!m) {
    return NextResponse.json(
      { error: "Municipio nao encontrado" },
      { status: 400 },
    );
  }

  const contrato = await prisma.contratoMunicipal.create({
    data: {
      municipioId: data.municipioId,
      bancasSlug: data.bancasSlug,
      valorMensal: data.valorMensal,
      dataInicio: data.dataInicio,
      dataFim: data.dataFim ?? null,
      ativo: data.ativo ?? true,
      observacoes: data.observacoes ?? null,
    },
    select: { id: true },
  });

  let notasGeradas = 0;
  if (data.gerarNotasAutomaticas !== false) {
    const notasParaGerar = gerarNotasDoContrato(
      data.dataInicio,
      data.dataFim ?? null,
      data.valorMensal,
    );
    if (notasParaGerar.length > 0) {
      await prisma.notaFiscal.createMany({
        data: notasParaGerar.map((n) => ({
          contratoId: contrato.id,
          mesReferencia: n.mesReferencia,
          anoReferencia: n.anoReferencia,
          valorNota: n.valorNota,
          dataVencimento: n.dataVencimento,
        })),
      });
      notasGeradas = notasParaGerar.length;
    }
  }

  return NextResponse.json(
    { id: contrato.id, notasGeradas },
    { status: 201 },
  );
}
