import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { ACOES, extrairIp, registrarLog } from "@/lib/audit-log";
import { authOptions } from "@/lib/auth";
import {
  carregarEventos,
  type CalendarEvento,
  type EventoOrigem,
} from "@/lib/compromissos";
import { prisma } from "@/lib/prisma";
import { compromissoCreateSchema } from "@/lib/schemas";

const ORIGENS_VALIDAS: EventoOrigem[] = [
  "compromisso",
  "prazoTce",
  "prazoJudicial",
];

function parseOrigens(v: string | null): EventoOrigem[] | undefined {
  if (!v) return undefined;
  const parts = v
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is EventoOrigem =>
      ORIGENS_VALIDAS.includes(s as EventoOrigem),
    );
  return parts.length > 0 ? parts : undefined;
}

export async function GET(req: Request): Promise<NextResponse<CalendarEvento[] | { error: string }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const url = new URL(req.url);
  const inicioStr = url.searchParams.get("inicio");
  const fimStr = url.searchParams.get("fim");
  if (!inicioStr || !fimStr) {
    return NextResponse.json(
      { error: "Parametros inicio e fim sao obrigatorios" },
      { status: 400 },
    );
  }
  const inicio = new Date(inicioStr);
  const fim = new Date(fimStr);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return NextResponse.json({ error: "Datas invalidas" }, { status: 400 });
  }
  const advogadoId = url.searchParams.get("advogadoId") || undefined;
  const origens = parseOrigens(url.searchParams.get("origens"));

  const eventos = await carregarEventos({
    escritorioId,
    inicio,
    fim,
    advogadoId,
    origens,
    userId: session.user.id,
  });
  return NextResponse.json(eventos);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const body = await req.json().catch(() => null);
  const parsed = compromissoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const adv = await prisma.user.findFirst({
    where: { id: data.advogadoId, escritorioId },
    select: { id: true },
  });
  if (!adv) {
    return NextResponse.json(
      { error: "Advogado responsavel nao encontrado" },
      { status: 400 },
    );
  }

  if (data.processoTceId) {
    const pTce = await prisma.processoTce.findFirst({
      where: { id: data.processoTceId, escritorioId },
      select: { id: true },
    });
    if (!pTce) {
      return NextResponse.json(
        { error: "Processo TCE nao encontrado" },
        { status: 400 },
      );
    }
  }
  if (data.processoId) {
    const pJud = await prisma.processo.findFirst({
      where: { id: data.processoId, escritorioId },
      select: { id: true },
    });
    if (!pJud) {
      return NextResponse.json(
        { error: "Processo judicial nao encontrado" },
        { status: 400 },
      );
    }
  }

  const categoria = data.categoria ?? "ESCRITORIO";
  const privado = categoria !== "ESCRITORIO";

  const compromisso = await prisma.compromisso.create({
    data: {
      titulo: data.titulo.trim(),
      descricao: data.descricao?.trim() || null,
      dataInicio: data.dataInicio,
      dataFim: data.dataFim ?? null,
      diaInteiro: data.diaInteiro,
      cor: data.cor ?? null,
      tipo: data.tipo,
      categoria,
      privado,
      local: data.local?.trim() || null,
      advogadoId: data.advogadoId,
      processoTceId: data.processoTceId || null,
      processoId: data.processoId || null,
      escritorioId,
    },
    select: { id: true },
  });

  await registrarLog({
    userId: session.user.id,
    acao: ACOES.CRIAR_COMPROMISSO,
    entidade: "Compromisso",
    entidadeId: compromisso.id,
    descricao: `${session.user.name ?? "Usuario"} criou compromisso "${data.titulo}"`,
    detalhes: { tipo: data.tipo, dataInicio: data.dataInicio },
    ip: extrairIp(req),
  });

  return NextResponse.json(compromisso, { status: 201 });
}
