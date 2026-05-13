import type { Prisma } from "@prisma/client";

export type UsuarioPermissoes = {
  id: string;
  email?: string | null;
};

const EMAILS_PRIVADOS = new Set([
  "gabriel@escritorio.com",
  "gabrielvidal97@gmail.com",
]);

export function podeUsarCategoriasPrivadas(
  user: UsuarioPermissoes | null | undefined,
): boolean {
  if (!user?.email) return false;
  return EMAILS_PRIVADOS.has(user.email.trim().toLowerCase());
}

export function podeVerCompromisso(
  user: UsuarioPermissoes | null | undefined,
  compromisso: { privado: boolean; advogadoId: string },
): boolean {
  if (!compromisso.privado) return true;
  if (!user) return false;
  return compromisso.advogadoId === user.id;
}

export function filtroVisibilidadeCompromissos(
  user: UsuarioPermissoes | null | undefined,
): Prisma.CompromissoWhereInput {
  if (!user) return { privado: false };
  return {
    OR: [{ privado: false }, { advogadoId: user.id }],
  };
}

export function filtroSomenteEscritorio(): Prisma.CompromissoWhereInput {
  return { privado: false };
}
