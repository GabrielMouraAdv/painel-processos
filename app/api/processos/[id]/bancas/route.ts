import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { BANCA_SLUGS_VALIDOS, isBancaSlug } from "@/lib/bancas";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  bancasSlug: z
    .array(z.string())
    .max(BANCA_SLUGS_VALIDOS.length)
    .transform((arr) =>
      Array.from(
        new Set(
          arr
            .map((s) => s.trim().toLowerCase())
            .filter((s) => s.length > 0),
        ),
      ),
    )
    .refine((arr) => arr.every(isBancaSlug), {
      message: "Slug de banca invalido",
    }),
});

export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const escritorioId = session.user.escritorioId;

  const existing = await prisma.processo.findFirst({
    where: { id: params.id, escritorioId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await prisma.processo.update({
    where: { id: params.id },
    data: { bancasSlug: parsed.data.bancasSlug },
  });

  return NextResponse.json({ ok: true, bancasSlug: parsed.data.bancasSlug });
}
