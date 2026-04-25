import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { calcularDataVencimento, diasUteisEntre } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  tipo: z.string().min(1),
  dataIntimacao: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v))),
  dataVencimento: z
    .union([z.string(), z.date()])
    .nullish()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      return v instanceof Date ? v : new Date(v);
    }),
  diasUteis: z.coerce.number().int().min(1).optional(),
  prorrogavel: z.boolean().optional().default(true),
  advogadoRespId: z.string().nullish(),
  observacoes: z.string().nullish(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const sub = await prisma.subprocessoTce.findFirst({
    where: { id: params.id, processoPai: { escritorioId } },
    select: { id: true },
  });
  if (!sub) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const dataInt = new Date(data.dataIntimacao);
  dataInt.setHours(0, 0, 0, 0);
  let dias = data.diasUteis ?? 0;
  let dataVenc: Date;
  if (data.dataVencimento) {
    dataVenc = new Date(data.dataVencimento);
    dataVenc.setHours(0, 0, 0, 0);
    dias = Math.max(1, diasUteisEntre(dataInt, dataVenc));
  } else if (dias > 0) {
    dataVenc = calcularDataVencimento(dataInt, dias);
  } else {
    return NextResponse.json(
      { error: "Informe diasUteis ou dataVencimento" },
      { status: 400 },
    );
  }

  await prisma.prazoSubprocessoTce.create({
    data: {
      subprocessoId: sub.id,
      tipo: data.tipo,
      dataIntimacao: dataInt,
      dataVencimento: dataVenc,
      diasUteis: dias,
      prorrogavel: data.prorrogavel,
      advogadoRespId: data.advogadoRespId?.trim() || null,
      observacoes: data.observacoes?.trim() || null,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
