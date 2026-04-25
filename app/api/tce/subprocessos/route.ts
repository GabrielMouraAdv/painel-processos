import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TipoRecursoTce } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { calcularDataVencimento } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import {
  TCE_RECURSO_CODE,
  TCE_RECURSO_FASE_INICIAL,
  TCE_RECURSO_LABELS,
  getPrazoRecursoPorTipo,
} from "@/lib/tce-config";

const inputSchema = z.object({
  processoPaiId: z.string().min(1).optional(),
  subprocessoPaiId: z.string().min(1).optional(),
  tipoRecurso: z.nativeEnum(TipoRecursoTce),
  dataInterposicao: z.union([z.string(), z.date()]).transform((v) =>
    v instanceof Date ? v : new Date(v),
  ),
  dataIntimacao: z
    .union([z.string(), z.date(), z.null()])
    .nullish()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      return v instanceof Date ? v : new Date(v);
    }),
  relator: z.string().nullish(),
  observacoes: z.string().nullish(),
  advogadoRespId: z.string().nullish(),
});

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (!data.processoPaiId && !data.subprocessoPaiId) {
    return NextResponse.json(
      { error: "Informe processoPaiId ou subprocessoPaiId" },
      { status: 400 },
    );
  }

  // Resolve processoPai (raiz) e numero base do pai
  let processoPaiId: string;
  let baseNumero: string;
  if (data.subprocessoPaiId) {
    const sub = await prisma.subprocessoTce.findFirst({
      where: {
        id: data.subprocessoPaiId,
        processoPai: { escritorioId },
      },
      select: { id: true, numero: true, processoPaiId: true },
    });
    if (!sub) {
      return NextResponse.json(
        { error: "Subprocesso pai nao encontrado" },
        { status: 404 },
      );
    }
    processoPaiId = sub.processoPaiId;
    baseNumero = sub.numero;
  } else {
    const proc = await prisma.processoTce.findFirst({
      where: { id: data.processoPaiId!, escritorioId },
      select: { id: true, numero: true },
    });
    if (!proc) {
      return NextResponse.json(
        { error: "Processo pai nao encontrado" },
        { status: 404 },
      );
    }
    processoPaiId = proc.id;
    baseNumero = proc.numero;
  }

  // Calcula proximo numero sequencial para o tipo do recurso, dentro do mesmo pai
  const ultimoIrmao = await prisma.subprocessoTce.findFirst({
    where: data.subprocessoPaiId
      ? {
          subprocessoPaiId: data.subprocessoPaiId,
          tipoRecurso: data.tipoRecurso,
        }
      : {
          processoPaiId,
          subprocessoPaiId: null,
          tipoRecurso: data.tipoRecurso,
        },
    orderBy: { numeroSequencial: "desc" },
    select: { numeroSequencial: true },
  });
  const numeroSequencial = (ultimoIrmao?.numeroSequencial ?? 0) + 1;

  const code = TCE_RECURSO_CODE[data.tipoRecurso];
  const numero = `${baseNumero}${code}${pad3(numeroSequencial)}`;
  const fase = TCE_RECURSO_FASE_INICIAL[data.tipoRecurso];

  const prazoCfg = getPrazoRecursoPorTipo(data.tipoRecurso);

  const subprocesso = await prisma.$transaction(async (tx) => {
    const sub = await tx.subprocessoTce.create({
      data: {
        processoPaiId,
        subprocessoPaiId: data.subprocessoPaiId ?? null,
        numero,
        tipoRecurso: data.tipoRecurso,
        numeroSequencial,
        dataInterposicao: data.dataInterposicao,
        dataIntimacao: data.dataIntimacao ?? null,
        fase,
        relator: data.relator?.trim() || null,
        observacoes: data.observacoes?.trim() || null,
      },
    });

    // Andamento automatico no processo pai
    await tx.andamentoTce.create({
      data: {
        processoId: processoPaiId,
        data: data.dataInterposicao,
        fase,
        descricao: `Recurso ${TCE_RECURSO_LABELS[data.tipoRecurso]} interposto — subprocesso ${numero}.`,
        autorId: userId,
      },
    });

    // Prazo automatico no subprocesso, se houver config e dataIntimacao
    if (prazoCfg && data.dataIntimacao) {
      const dataInt = new Date(data.dataIntimacao);
      dataInt.setHours(0, 0, 0, 0);
      await tx.prazoSubprocessoTce.create({
        data: {
          subprocessoId: sub.id,
          tipo: prazoCfg.tipo,
          dataIntimacao: dataInt,
          dataVencimento: calcularDataVencimento(dataInt, prazoCfg.diasUteis),
          diasUteis: prazoCfg.diasUteis,
          prorrogavel: prazoCfg.prorrogavel,
          advogadoRespId: data.advogadoRespId?.trim() || null,
          observacoes: prazoCfg.observacao ?? null,
        },
      });
    }

    return sub;
  });

  return NextResponse.json(
    {
      id: subprocesso.id,
      numero: subprocesso.numero,
    },
    { status: 201 },
  );
}
