"use client";

import Link from "next/link";
import { LogOut, UserCircle2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { iniciais } from "@/lib/iniciais";

export function LogoutButton() {
  const { data: session } = useSession();
  const nome = session?.user?.name ?? "Usuário";
  const email = session?.user?.email ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu do usuário"
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-brand-tinta transition-colors hover:bg-background"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-brand-navy">
            {iniciais(nome)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-brand-tinta">
              {nome}
            </span>
            {email && (
              <span className="block truncate text-[11px] text-muted-foreground">
                {email}
              </span>
            )}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="truncate">{nome}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/perfil" className="cursor-pointer">
            <UserCircle2 className="h-4 w-4" aria-hidden="true" />
            Meu Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-700"
          onSelect={(e) => {
            e.preventDefault();
            signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
