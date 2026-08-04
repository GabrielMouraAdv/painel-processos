import { redirect } from "next/navigation";
import { getServerSession, type Session } from "next-auth";

import { authOptions } from "@/lib/auth";
import { DOMINIO_ELEITORAL, isUsuarioEleitoral } from "@/lib/eleitoral";
import { prisma } from "@/lib/prisma";

/** Guarda de pagina: exige sessao do dominio eleitoral ou redireciona. */
export async function exigirPaginaEleitoral(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!isUsuarioEleitoral(session.user.email)) redirect("/app");
  return session;
}

/** Usuarios do dominio eleitoral (para selects de coordenador/responsavel). */
export async function listarUsuariosEleitoral(escritorioId: string) {
  return prisma.user.findMany({
    where: { escritorioId, email: { endsWith: DOMINIO_ELEITORAL } },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
}
