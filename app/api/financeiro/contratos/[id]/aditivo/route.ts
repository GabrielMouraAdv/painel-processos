import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { gerarAditivoDocx } from "@/lib/aditivo-docx";
import { findEscritorio } from "@/lib/escritorios-emissores";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { aditivoInputSchema } from "@/lib/schemas";
import { ensureBucket, getPublicUrl, uploadFile } from "@/lib/storage";

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

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Body invalido" }, { status: 400 });
    }
    const parsed = aditivoInputSchema.safeParse(body);
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
    const data = parsed.data;

    const escritorio = findEscritorio(data.escritorioSlug);
    if (!escritorio) {
      return NextResponse.json(
        { error: "Escritorio emissor invalido" },
        { status: 400 },
      );
    }

    const contrato = await prisma.contratoMunicipal.findFirst({
      where: {
        id: params.id,
        municipio: { escritorioId: session.user.escritorioId },
      },
      include: {
        municipio: { select: { nome: true, uf: true } },
      },
    });
    if (!contrato) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }

    if (
      !contrato.bancasSlug.includes(data.escritorioSlug) &&
      !["filipe-campos", "porto-rodrigues", "gabriel-moura"].includes(
        data.escritorioSlug,
      )
    ) {
      return NextResponse.json(
        { error: "Escritorio nao vinculado ao contrato" },
        { status: 400 },
      );
    }

    let docx: { buffer: Buffer; nomeArquivo: string };
    try {
      docx = await gerarAditivoDocx({
        contrato: {
          numeroContrato: contrato.numeroContrato,
          objetoDoContrato: contrato.objetoDoContrato,
          valorMensal: Number(contrato.valorMensal),
          dataInicio: contrato.dataInicio,
          dataFim: contrato.dataFim,
          municipio: contrato.municipio,
          orgaoContratante: contrato.orgaoContratante,
          cnpjContratante: contrato.cnpjContratante,
          representanteContratante: contrato.representanteContratante,
          cargoRepresentante: contrato.cargoRepresentante,
        },
        tipo: data.tipo,
        justificativa: data.justificativa,
        fundamento: data.fundamento,
        escritorioSlug: data.escritorioSlug,
        advogadoIdx: data.advogadoIdx ?? 0,
      });
    } catch (errGen) {
      console.error("[POST aditivo] erro ao gerar docx:", errGen);
      return NextResponse.json(
        {
          error:
            errGen instanceof Error
              ? errGen.message
              : "Falha ao gerar o documento",
        },
        { status: 500 },
      );
    }

    let url: string | null = null;
    try {
      await ensureBucket();
      const path = `aditivos/${contrato.id}/${docx.nomeArquivo}`;
      await uploadFile(
        docx.buffer,
        path,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      url = getPublicUrl(path);
    } catch (errUp) {
      console.error("[POST aditivo] upload falhou (continuando):", errUp);
    }

    const aditivo = await prisma.aditivoContrato.create({
      data: {
        contratoId: contrato.id,
        tipo: data.tipo,
        justificativa: data.justificativa,
        fundamento: data.fundamento,
        escritorioSlug: data.escritorioSlug,
        advogadoIdx: data.advogadoIdx ?? 0,
        arquivoUrl: url,
        arquivoNome: docx.nomeArquivo,
      },
      select: { id: true, arquivoUrl: true, arquivoNome: true },
    });

    return NextResponse.json({
      id: aditivo.id,
      url: aditivo.arquivoUrl,
      nome: aditivo.arquivoNome,
      // Devolve em base64 caso upload tenha falhado para fallback de download
      base64: url ? null : docx.buffer.toString("base64"),
    });
  } catch (err) {
    console.error("[POST /aditivo] erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
