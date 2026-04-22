"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span>Sair</span>
    </button>
  );
}
