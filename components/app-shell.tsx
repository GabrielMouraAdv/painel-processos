"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, Search, X } from "lucide-react";

import { GlobalSearch } from "./global-search";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  prazosUrgentes: number;
  prazosTceUrgentes: number;
  processosTceTotal: number;
  pautasJudiciaisTotal: number;
  alertasMonitoramento: number;
  despachosTcePendentes: number;
  podeFinanceiro: boolean;
};

export function AppShell({
  children,
  prazosUrgentes,
  prazosTceUrgentes,
  processosTceTotal,
  pautasJudiciaisTotal,
  alertasMonitoramento,
  despachosTcePendentes,
  podeFinanceiro,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const pathname = usePathname();

  // Fecha o drawer ao navegar (mobile)
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Atalho global Ctrl+K (Win/Linux) ou Cmd+K (Mac)
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Overlay de fundo (mobile) */}
      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar: drawer em mobile, fixa em desktop */}
      <aside
        aria-label="Navegacao principal"
        className={cn(
          "fixed inset-y-0 left-0 z-40 h-screen w-[280px] transform transition-transform duration-200 ease-out",
          "md:static md:w-64 md:translate-x-0 md:transition-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Botao fechar dentro do drawer (mobile) */}
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="absolute right-2 top-2 z-10 rounded-md p-2 text-slate-200 hover:bg-white/10 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
        <Sidebar
          prazosUrgentes={prazosUrgentes}
          prazosTceUrgentes={prazosTceUrgentes}
          processosTceTotal={processosTceTotal}
          pautasJudiciaisTotal={pautasJudiciaisTotal}
          alertasMonitoramento={alertasMonitoramento}
          despachosTcePendentes={despachosTcePendentes}
          podeFinanceiro={podeFinanceiro}
          onOpenSearch={() => setSearchOpen(true)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header mobile */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b bg-white px-3 shadow-sm md:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="rounded-md p-2 text-brand-navy hover:bg-slate-100"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="truncate text-sm font-semibold text-brand-navy">
            Gestao Processual
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Buscar"
              onClick={() => setSearchOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Sair"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
