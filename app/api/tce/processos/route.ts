import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processoTceInputSchema } from "@/lib/schemas";
import { prazoAutomaticoDaFase } from "@/lib/tce-config";

function addDiasUteis(from: Date, diasUteis: number): Date {
  const d = new Date(from);
  let restantes = diasUteis;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) restantes--;
  }
  return d;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = processoTceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.municipioId) {
    const m = await prisma.municipio.findFirst({
      where: { id: data.municipioId, escritorioId },
      select: { id: true },
    });
    if (!m) {
      return NextResponse.json(
        { error: "Municipio nao encontrado" },
        { status: 400 },
      );
    }
  }

  if (data.interessados.length > 0) {
    const ids = data.interessados.map((i) => i.gestorId);
    const encontrados = await prisma.gestor.findMany({
      where: { id: { in: ids }, escritorioId },
      select: { id: true },
    });
    if (encontrados.length !== ids.length) {
      return NextResponse.json(
        { error: "Interessado invalido" },
        { status: 400 },
      );
    }
  }

  try {
    const processo = await prisma.processoTce.create({
      data: {
        numero: data.numero,
        tipo: data.tipo,
        municipioId: data.municipioId || null,
        relator: data.relator || null,
        camara: data.camara,
        faseAtual: data.faseAtual,
        conselheiroSubstituto: data.conselheiroSubstituto || null,
        notaTecnica: data.notaTecnica ?? false,
        parecerMpco: data.parecerMpco ?? false,
        despachadoComRelator: data.despachadoComRelator ?? false,
        memorialPronto: data.memorialPronto ?? false,
        exercicio: data.exercicio || null,
        valorAutuado: data.valorAutuado ?? null,
        objeto: data.objeto,
        dataAutuacao: data.dataAutuacao ?? null,
        dataIntimacao: data.dataIntimacao ?? null,
        escritorioId,
        interessados: {
          create: data.interessados.map((i) => ({
            gestorId: i.gestorId,
            cargo: i.cargo,
          })),
        },
      },
      select: { id: true },
    });

    const prazoConfig = prazoAutomaticoDaFase(data.tipo, data.faseAtual);
    if (prazoConfig && data.dataIntimacao) {
      await prisma.prazoTce.create({
        data: {
          processoId: processo.id,
          tipo: prazoConfig.tipo,
          dataIntimacao: data.dataIntimacao,
          dataVencimento: addDiasUteis(data.dataIntimacao, prazoConfig.diasUteis),
          diasUteis: prazoConfig.diasUteis,
          prorrogavel: prazoConfig.prorrogavel,
          advogadoRespId: userId,
          observacoes: `Prazo gerado automaticamente da fase ${data.faseAtual}.`,
        },
      });
    }

    return NextResponse.json({ id: processo.id }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro";
    if (msg.includes("Unique")) {
      return NextResponse.json(
        { error: "Ja existe um processo com esse numero" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Erro ao criar processo" }, { status: 500 });
  }
}
