import Link from "next/link";
import {
  LayoutDashboard,
  Scale,
  Users,
  CalendarDays,
  FileText,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Painel", href: "/", icon: LayoutDashboard },
  { label: "Processos", href: "/processos", icon: Scale },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Agenda", href: "/agenda", icon: CalendarDays },
  { label: "Documentos", href: "/documentos", icon: FileText },
  { label: "Configuracoes", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  return (
    <aside
      className="flex h-screen w-64 flex-col bg-brand-navy text-slate-100"
      aria-label="Navegacao principal"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Gestao</p>
          <p className="text-xs leading-tight text-slate-300">Processual</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                "text-slate-200 transition-colors hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-300">
        <p className="font-semibold text-slate-100">Painel Juridico</p>
        <p>v0.1.0</p>
      </div>
    </aside>
  );
}
