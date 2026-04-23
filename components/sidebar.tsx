import Link from "next/link";
import {
  BarChart3,
  Building2,
  CalendarClock,
  CalendarRange,
  Gavel,
  Landmark,
  LayoutDashboard,
  Scale,
  UserCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeTone?: "red" | "navy";
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

type Props = {
  prazosUrgentes?: number;
  prazosTceUrgentes?: number;
  processosTceTotal?: number;
};

export function Sidebar({
  prazosUrgentes = 0,
  prazosTceUrgentes = 0,
  processosTceTotal = 0,
}: Props) {
  const groups: NavGroup[] = [
    {
      title: "Judicial",
      items: [
        { label: "Dashboard", href: "/app", icon: LayoutDashboard },
        { label: "Processos", href: "/app/processos", icon: Scale },
        {
          label: "Prazos",
          href: "/app/prazos",
          icon: CalendarClock,
          badge: prazosUrgentes > 0 ? prazosUrgentes : undefined,
          badgeTone: "red",
        },
        { label: "Pautas", href: "/app/pautas", icon: CalendarRange },
        { label: "Gestores", href: "/app/gestores", icon: Users },
        { label: "Relatorios", href: "/app/relatorios", icon: BarChart3 },
      ],
    },
    {
      title: "Tribunal de Contas",
      items: [
        { label: "Dashboard TCE", href: "/app/tce", icon: LayoutDashboard },
        {
          label: "Processos TCE",
          href: "/app/tce/processos",
          icon: Gavel,
          badge: processosTceTotal > 0 ? processosTceTotal : undefined,
          badgeTone: "navy",
        },
        { label: "Pauta", href: "/app/tce/pauta", icon: CalendarRange },
        { label: "Municipios", href: "/app/tce/municipios", icon: Building2 },
        { label: "Interessados", href: "/app/tce/interessados", icon: UserCheck },
        {
          label: "Prazos TCE",
          href: "/app/tce/prazos",
          icon: CalendarClock,
          badge: prazosTceUrgentes > 0 ? prazosTceUrgentes : undefined,
          badgeTone: "red",
        },
      ],
    },
  ];

  return (
    <aside
      className="flex h-screen w-64 flex-col bg-brand-navy text-slate-100"
      aria-label="Navegacao principal"
    >
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Gestao</p>
          <p className="text-xs leading-tight text-slate-300">Processual</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        {groups.map((group, index) => (
          <div
            key={group.title}
            className={cn(index > 0 && "mt-6 border-t border-white/10 pt-6")}
          >
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium",
                      "text-slate-200 transition-colors hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none text-white",
                          item.badgeTone === "navy"
                            ? "bg-white/15 text-slate-100"
                            : "bg-red-500",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/10 px-6 py-4 text-xs text-slate-300">
        <LogoutButton />
        <div>
          <p className="font-semibold text-slate-100">Painel Juridico</p>
          <p>v0.1.0</p>
        </div>
      </div>
    </aside>
  );
}
