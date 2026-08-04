import { NextResponse } from "next/server";
import { z } from "zod";

import { registrarLog } from "@/lib/audit-log";
import { exigirSessaoEleitoral } from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

const resolucaoSchema = z.discriminatedUnion("acao", [
  z.object({
    acao: z.literal("dispensar"),
    motivo: z.string().trim().optional().nullable(),
  }),
  z.object({
    acao: z.literal("outro_escritorio"),
    escritorioResponsavel: z
      .string()
      .trim()
      .min(1, "Informe o escritorio responsavel"),
  }),
  z.object({
    acao: z.literal("reabrir"),
  }),
]);

/** Resolve uma deteccao da triagem: dispensar, outro escritorio ou reabrir. */
export async function PATCH(req: Request, { params }: Params) {
  const session = await exigirSessaoEleitoral();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const deteccao = await prisma.deteccaoEleitoral.findFirst({
    where: { id: params.id, escritorioId: session.user.escritorioId },
  });
  if (!deteccao) {
    return NextResponse.json(
      { error: "Deteccao nao encontrada" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = resolucaoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  if (d.acao === "reabrir") {
    const atualizada = await prisma.deteccaoEleitoral.update({
      where: { id: deteccao.id },
      data: {
        status: "PENDENTE",
        escritorioResponsavel: null,
        motivoDispensa: null,
        resolvidoPorId: null,
        resolvidoEm: null,
      },
    });
    await registrarLog({
      userId: session.user.id,
      acao: "REABRIR_DETECCAO_ELEITORAL",
      entidade: "DeteccaoEleitoral",
      entidadeId: deteccao.id,
      descricao: `Reabriu na triagem a deteccao ${deteccao.numero}`,
    });
    return NextResponse.json({ deteccao: atualizada });
  }

  if (deteccao.status !== "PENDENTE") {
    return NextResponse.json(
      { error: "Deteccao ja resolvida" },
      { status: 409 },
    );
  }

  const atualizada = await prisma.deteccaoEleitoral.update({
    where: { id: deteccao.id },
    data:
      d.acao === "dispensar"
        ? {
            status: "DISPENSADO",
            motivoDispensa: d.motivo || null,
            resolvidoPorId: session.user.id,
            resolvidoEm: new Date(),
          }
        : {
            status: "OUTRO_ESCRITORIO",
            escritorioResponsavel: d.escritorioResponsavel,
            resolvidoPorId: session.user.id,
            resolvidoEm: new Date(),
          },
  });

  await registrarLog({
    userId: session.user.id,
    acao:
      d.acao === "dispensar"
        ? "DISPENSAR_DETECCAO_ELEITORAL"
        : "DETECCAO_OUTRO_ESCRITORIO",
    entidade: "DeteccaoEleitoral",
    entidadeId: deteccao.id,
    descricao:
      d.acao === "dispensar"
        ? `Dispensou a deteccao ${deteccao.numero}`
        : `Marcou a deteccao ${deteccao.numero} como responsabilidade de: ${d.escritorioResponsavel}`,
  });

  return NextResponse.json({ deteccao: atualizada });
}
