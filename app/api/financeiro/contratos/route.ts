import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { gerarNotasDoContrato, podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { contratoMunicipalInputSchema } from "@/lib/schemas";

export async function GET(req: Request) {
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
  } catch (err) {
    console.error("[GET /api/financeiro/contratos] erro:", err);
    return NextResponse.json(
      { error: "Erro interno ao listar contratos" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Body invalido (JSON malformado ou vazio)" },
        { status: 400 },
      );
    }

    const parsed = contratoMunicipalInputSchema.safeParse(body);
    if (!parsed.success) {
      console.warn(
        "[POST /api/financeiro/contratos] validacao falhou:",
        parsed.error.flatten(),
      );
      // Constroi mensagem amigavel a partir do primeiro erro
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

    // valorMensal como string para evitar problemas de precisao do Decimal
    const valorMensalStr = data.valorMensal.toFixed(2);

    const contrato = await prisma.contratoMunicipal.create({
      data: {
        municipioId: data.municipioId,
        bancasSlug: data.bancasSlug,
        valorMensal: valorMensalStr,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim ?? null,
        ativo: data.ativo ?? true,
        observacoes: data.observacoes ?? null,
        dataRenovacao: data.dataRenovacao ?? null,
        diasAvisoRenovacao: data.diasAvisoRenovacao ?? 60,
        observacoesRenovacao: data.observacoesRenovacao ?? null,
        numeroContrato: data.numeroContrato ?? null,
        cnpjContratante: data.cnpjContratante ?? null,
        orgaoContratante: data.orgaoContratante ?? null,
        representanteContratante: data.representanteContratante ?? null,
        cargoRepresentante: data.cargoRepresentante ?? null,
        objetoDoContrato: data.objetoDoContrato,
      },
      select: { id: true },
    });

    let notasGeradas = 0;
    if (data.gerarNotasAutomaticas !== false) {
      try {
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
              valorNota: n.valorNota.toFixed(2),
              dataVencimento: n.dataVencimento,
            })),
          });
          notasGeradas = notasParaGerar.length;
        }
      } catch (errGen) {
        // Contrato ja foi criado — geracao falhou, mas nao bloqueia o sucesso
        console.error(
          "[POST /api/financeiro/contratos] erro ao gerar notas auto:",
          errGen,
        );
      }
    }

    return NextResponse.json(
      { id: contrato.id, notasGeradas },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST /api/financeiro/contratos] erro:", err);
    const msg =
      err instanceof Error ? err.message : "Erro interno ao criar contrato";
    return NextResponse.json(
      { error: msg },
      { status: 500 },
    );
  }
}
