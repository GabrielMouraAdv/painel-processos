import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Multa por responsavel: grava no processo a soma das multas (e devolucoes)
// individuais. So acontece quando o usuario pede, para nao apagar um total
// que foi lancado direto no processo.
const schema = z.object({ processoId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
  }
  const processo = await prisma.processoTce.findFirst({
    where: { id: parsed.data.processoId, escritorioId: session.user.escritorioId },
    select: {
      id: true, numero: true, valorMulta: true, valorDevolucao: true,
      interessados: { select: { valorMulta: true, valorDevolucao: true } },
    },
  });
  if (!processo) return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });

  const comMulta = processo.interessados.filter((i) => i.valorMulta !== null);
  const comDevolucao = processo.interessados.filter((i) => i.valorDevolucao !== null);
  if (comMulta.length === 0 && comDevolucao.length === 0) {
    return NextResponse.json({ error: "Nenhum valor individual lançado" }, { status: 400 });
  }
  const soma = (xs: { toString(): string }[]) =>
    Math.round(xs.reduce((s: number, v) => s + Number(v.toString()), 0) * 100) / 100;
  const novaMulta = comMulta.length ? soma(comMulta.map((i) => i.valorMulta!)) : undefined;
  const novaDevolucao = comDevolucao.length ? soma(comDevolucao.map((i) => i.valorDevolucao!)) : undefined;

  await prisma.processoTce.update({
    where: { id: processo.id },
    data: {
      ...(novaMulta !== undefined && { valorMulta: novaMulta }),
      ...(novaDevolucao !== undefined && { valorDevolucao: novaDevolucao }),
    },
  });
  await registrarLog({
    userId: session.user.id,
    acao: "SOMAR_MULTAS_INDIVIDUAIS",
    entidade: "ProcessoTce",
    entidadeId: processo.id,
    descricao: `${session.user.name ?? "Usuario"} aplicou a soma das multas individuais no processo ${processo.numero}`,
    detalhes: {
      antes: { valorMulta: processo.valorMulta?.toString() ?? null, valorDevolucao: processo.valorDevolucao?.toString() ?? null },
      depois: { valorMulta: novaMulta ?? null, valorDevolucao: novaDevolucao ?? null },
    },
    ip: extrairIp(req),
  });
  return NextResponse.json({ ok: true, valorMulta: novaMulta ?? null, valorDevolucao: novaDevolucao ?? null });
}
