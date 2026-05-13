import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { podeUsarCategoriasPrivadas } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

import { CompromissosView } from "./compromissos-view";

export default async function CompromissosPage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;
  const userId = session!.user.id;
  const isAdmin = session!.user.role === Role.ADMIN;
  const podePrivado = podeUsarCategoriasPrivadas({
    id: userId,
    email: session!.user.email,
  });

  const [advogados, processosTce, processosJud] = await Promise.all([
    prisma.user.findMany({
      where: {
        escritorioId,
        role: { in: [Role.ADMIN, Role.ADVOGADO] },
      },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.processoTce.findMany({
      where: { escritorioId },
      orderBy: { numero: "asc" },
      select: {
        id: true,
        numero: true,
        municipio: { select: { nome: true } },
      },
    }),
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: { numero: "asc" },
      select: {
        id: true,
        numero: true,
        gestor: { select: { nome: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <CompromissosView
        usuario={{ id: userId, nome: session!.user.name ?? "Usuario" }}
        isAdmin={isAdmin}
        podeUsarPrivadas={podePrivado}
        advogados={advogados}
        processosTce={processosTce.map((p) => ({
          id: p.id,
          numero: p.numero,
          municipio: p.municipio?.nome ?? null,
        }))}
        processosJud={processosJud.map((p) => ({
          id: p.id,
          numero: p.numero,
          gestor: p.gestor.nome,
        }))}
      />
    </div>
  );
}
