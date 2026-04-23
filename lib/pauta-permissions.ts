import { Role } from "@prisma/client";

export function podeEditarPauta(role: Role | null | undefined): boolean {
  return role === Role.ADMIN || role === Role.SECRETARIA;
}
