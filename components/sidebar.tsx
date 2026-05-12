import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  ClipboardCheck,
  DollarSign,
  Gavel,
  History,
  Home,
  Landmark,
  LayoutDashboard,
  Scale,
  Search,
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
  pautasJudiciaisTotal?: number;
  alertasMonitoramento?: number;
  despachosTcePendentes?: number;
  compromissosHoje?: number;
  podeFinanceiro?: boolean;
  isAdmin?: boolean;
  onOpenSearch?: () => void;
};

export function Sidebar({
  prazosUrgentes = 0,
  prazosTceUrgentes = 0,
  processosTceTotal = 0,
  pautasJudiciaisTotal = 0,
  alertasMonitoramento = 0,
  despachosTcePendentes = 0,
  compromissosHoje = 0,
  podeFinanceiro = false,
  isAdmin = false,
  onOpenSearch,
}: Props) {
  const groups: NavGroup[] = [
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
        {
          label: "Despachos",
          href: "/app/tce/despachos",
          icon: ClipboardCheck,
          badge:
            despachosTcePendentes > 0 ? despachosTcePendentes : undefined,
          badgeTone: "navy",
        },
      ],
    },
    {
      title: "Judicial",
      items: [
        { label: "Dashboard", href: "/app/judicial", icon: LayoutDashboard },
        { label: "Processos", href: "/app/processos", icon: Scale },
        {
          label: "Prazos",
          href: "/app/prazos",
          icon: CalendarClock,
          badge: prazosUrgentes > 0 ? prazosUrgentes : undefined,
          badgeTone: "red",
        },
        {
          label: "Pautas",
          href: "/app/pautas",
          icon: CalendarRange,
          badge:
            pautasJudiciaisTotal > 0 ? pautasJudiciaisTotal : undefined,
          badgeTone: "navy",
        },
        { label: "Gestores", href: "/app/gestores", icon: Users },
        {
          label: "Monitoramento",
          href: "/app/monitoramento",
          icon: Activity,
          badge:
            alertasMonitoramento > 0 ? alertasMonitoramento : undefined,
          badgeTone: "red",
        },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col bg-brand-navy text-slate-100">
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10">
          <Landmark className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Gestao</p>
          <p className="text-xs leading-tight text-slate-300">Processual</p>
        </div>
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Buscar (Ctrl+K)"
            title="Buscar (Ctrl+K)"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 transition-colors hover:bg-white/15 hover:text-white"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <kbd className="hidden font-mono text-[10px] font-semibold leading-none text-slate-300 lg:inline">
              Ctrl+K
            </kbd>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        <div className="space-y-1 pb-2">
          <Link
            href="/app"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "text-slate-200 transition-colors hover:bg-white/10 hover:text-white",
            )}
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>Inicio</span>
          </Link>
          <Link
            href="/app/compromissos"
            className={cn(
              "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "text-slate-200 transition-colors hover:bg-white/10 hover:text-white",
            )}
          >
            <span className="flex items-center gap-3">
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              <span>Compromissos</span>
            </span>
            {compromissosHoje > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold leading-none text-white">
                {compromissosHoje}
              </span>
            )}
          </Link>
          <Link
            href="/app/relatorios"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "text-slate-200 transition-colors hover:bg-white/10 hover:text-white",
            )}
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            <span>Relatorios</span>
          </Link>
          {podeFinanceiro && (
            <Link
              href="/app/financeiro"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                "text-slate-200 transition-colors hover:bg-white/10 hover:text-white",
              )}
            >
              <DollarSign className="h-4 w-4" aria-hidden="true" />
              <span>Financeiro</span>
            </Link>
          )}
        </div>
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
        {isAdmin && (
          <Link
            href="/app/admin/logs"
            className={cn(
              "-mx-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "text-slate-200 transition-colors hover:bg-white/10 hover:text-white",
            )}
          >
            <History className="h-4 w-4" aria-hidden="true" />
            <span>Logs</span>
          </Link>
        )}
        <LogoutButton />
        <div>
          <p className="font-semibold text-slate-100">Painel Juridico</p>
          <p>v0.1.0</p>
        </div>
      </div>
    </div>
  );
}
