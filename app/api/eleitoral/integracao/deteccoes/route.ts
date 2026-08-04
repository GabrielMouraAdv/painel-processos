import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Rota chamada pela rotina de monitoramento do PDPJ (nao ha sessao de
// usuario): autentica por Bearer com a senha de integracao.
function autorizado(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.INTEGRACAO_ELEITORAL_SECRET ?? "";
  return expected.length > 0 && auth === `Bearer ${expected}`;
}

const deteccaoSchema = z.object({
  numero: z.string().trim().min(10),
  classe: z.string().trim().optional().nullable(),
  parteAutora: z.string().trim().optional().nullable(),
  parteRe: z.string().trim().optional().nullable(),
  objeto: z.string().trim().optional().nullable(),
  relator: z.string().trim().optional().nullable(),
  orgao: z.string().trim().optional().nullable(),
  observacoes: z.string().trim().optional().nullable(),
  fonte: z.string().trim().optional().nullable(),
});

const bodySchema = z.object({
  deteccoes: z.array(deteccaoSchema).min(1).max(100),
});

export async function POST(req: Request) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const escritorio = await prisma.escritorio.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!escritorio) {
    return NextResponse.json(
      { error: "Escritorio nao encontrado" },
      { status: 500 },
    );
  }

  let novas = 0;
  let jaConhecidas = 0;
  const detalhes: Array<{ numero: string; resultado: string }> = [];

  for (const d of parsed.data.deteccoes) {
    // Ja e processo cadastrado ou deteccao ja registrada (qualquer status,
    // inclusive dispensada)? Entao nao reapresenta na triagem.
    const [processoExistente, deteccaoExistente] = await Promise.all([
      prisma.processoEleitoral.findUnique({
        where: { numero: d.numero },
        select: { id: true },
      }),
      prisma.deteccaoEleitoral.findUnique({
        where: { numero: d.numero },
        select: { id: true, status: true },
      }),
    ]);

    if (processoExistente || deteccaoExistente) {
      jaConhecidas += 1;
      detalhes.push({
        numero: d.numero,
        resultado: processoExistente
          ? "ja_cadastrado"
          : `deteccao_${deteccaoExistente!.status.toLowerCase()}`,
      });
      continue;
    }

    await prisma.deteccaoEleitoral.create({
      data: {
        numero: d.numero,
        classe: d.classe || null,
        parteAutora: d.parteAutora || null,
        parteRe: d.parteRe || null,
        objeto: d.objeto || null,
        relator: d.relator || null,
        orgao: d.orgao || null,
        observacoes: d.observacoes || null,
        fonte: d.fonte || "PDPJ",
        escritorioId: escritorio.id,
      },
    });
    novas += 1;
    detalhes.push({ numero: d.numero, resultado: "nova" });
  }

  return NextResponse.json({ novas, jaConhecidas, detalhes }, { status: 201 });
}
