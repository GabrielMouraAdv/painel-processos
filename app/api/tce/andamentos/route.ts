import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { calcularDataVencimento } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import { andamentoTceInputSchema } from "@/lib/schemas";
import { prazoAutomaticoDaFase } from "@/lib/tce-config";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = andamentoTceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const processo = await prisma.processoTce.findFirst({
    where: { id: data.processoId, escritorioId },
    select: { id: true, tipo: true },
  });
  if (!processo) {
    return NextResponse.json(
      { error: "Processo nao encontrado" },
      { status: 400 },
    );
  }

  const prazoConfig = prazoAutomaticoDaFase(processo.tipo, data.fase);
  const deveCriarPrazo = data.gerarPrazoAutomatico && !!prazoConfig;

  if (deveCriarPrazo) {
    if (!data.dataIntimacao) {
      return NextResponse.json(
        { error: "Informe a data de intimacao para gerar o prazo" },
        { status: 400 },
      );
    }
    if (!data.advogadoRespId) {
      return NextResponse.json(
        { error: "Selecione o advogado responsavel pelo prazo" },
        { status: 400 },
      );
    }
    const adv = await prisma.user.findFirst({
      where: { id: data.advogadoRespId, escritorioId },
      select: { id: true },
    });
    if (!adv) {
      return NextResponse.json(
        { error: "Advogado responsavel nao encontrado" },
        { status: 400 },
      );
    }
  }

  const andamento = await prisma.andamentoTce.create({
    data: {
      processoId: data.processoId,
      data: data.data,
      fase: data.fase,
      descricao: data.descricao,
      autorId: userId,
    },
    select: { id: true },
  });

  if (data.atualizarFaseProcesso !== false) {
    await prisma.processoTce.update({
      where: { id: data.processoId },
      data: { faseAtual: data.fase },
    });
  }

  let prazoId: string | null = null;
  if (deveCriarPrazo && prazoConfig && data.dataIntimacao && data.advogadoRespId) {
    const vencimento = calcularDataVencimento(
      data.dataIntimacao,
      prazoConfig.diasUteis,
    );
    const criado = await prisma.prazoTce.create({
      data: {
        processoId: data.processoId,
        tipo: prazoConfig.tipo,
        dataIntimacao: data.dataIntimacao,
        dataVencimento: vencimento,
        diasUteis: prazoConfig.diasUteis,
        prorrogavel: prazoConfig.prorrogavel,
        advogadoRespId: data.advogadoRespId,
        observacoes: `Prazo gerado automaticamente a partir da fase ${data.fase}.`,
      },
      select: { id: true },
    });
    prazoId = criado.id;
  }

  return NextResponse.json({ id: andamento.id, prazoId }, { status: 201 });
}
