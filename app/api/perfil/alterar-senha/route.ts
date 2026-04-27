import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const alterarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, "Informe a senha atual"),
  senhaNova: z
    .string()
    .min(6, "A nova senha deve ter no minimo 6 caracteres")
    .max(72, "Senha muito longa"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = alterarSenhaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, senha: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "Usuario nao encontrado" },
      { status: 404 },
    );
  }

  const senhaCorreta = await bcrypt.compare(parsed.data.senhaAtual, user.senha);
  if (!senhaCorreta) {
    return NextResponse.json(
      { error: "Senha atual incorreta" },
      { status: 400 },
    );
  }

  const novoHash = await bcrypt.hash(parsed.data.senhaNova, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { senha: novoHash },
  });

  return NextResponse.json({ ok: true });
}
