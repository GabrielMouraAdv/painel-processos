import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const horaRe = /^([0-1]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  receberLembreteDiario: z.boolean().optional(),
  horarioLembreteManha: z
    .string()
    .regex(horaRe, "Hora invalida (use HH:MM)")
    .optional()
    .nullable(),
  horarioLembreteTarde: z
    .string()
    .regex(horaRe, "Hora invalida (use HH:MM)")
    .optional()
    .nullable(),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(data.receberLembreteDiario !== undefined && {
        telegramReceberLembreteDiario: data.receberLembreteDiario,
      }),
      ...(data.horarioLembreteManha !== undefined && {
        telegramHorarioLembreteManha: data.horarioLembreteManha,
      }),
      ...(data.horarioLembreteTarde !== undefined && {
        telegramHorarioLembreteTarde: data.horarioLembreteTarde,
      }),
    },
  });
  await registrarLog({
    userId: session.user.id,
    acao: ACOES.PREFERENCIAS_TELEGRAM,
    entidade: "User",
    entidadeId: session.user.id,
    descricao: `${session.user.name ?? "Usuario"} ajustou preferencias de Telegram`,
    detalhes: data,
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true });
}
