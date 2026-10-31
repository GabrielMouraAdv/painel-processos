"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Calculator,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  ClipboardCheck,
  DollarSign,
  FileText,
  Gavel,
  History,
  Home,
  LayoutDashboard,
  Link as LinkIcon,
  ListChecks,
  Scale,
  Search,
  UserCheck,
  Users,
  Wand2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

// Menu lateral da Direcao A "Pauta": fundo claro, grupos por area de trabalho,
// pagina atual destacada. Todas as rotas existentes continuam acessiveis.

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeTone?: "red" | "navy";
  exato?: boolean; // so marca como ativo na rota exata (ex.: /app)
};

type NavGroup = {
  title?: string;
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
  modoEleitoral?: boolean;
  processosEleitoralTotal?: number;
  prazosEleitoralUrgentes?: number;
  deteccoesEleitoralPendentes?: number;
  onOpenSearch?: () => void;
};

const n = (v: number) => (v > 0 ? v : undefined);

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
  modoEleitoral = false,
  processosEleitoralTotal = 0,
  prazosEleitoralUrgentes = 0,
  deteccoesEleitoralPendentes = 0,
  onOpenSearch,
}: Props) {
  const pathname = usePathname() ?? "";

  const groupsEleitoral: NavGroup[] = [
    {
      title: "Eleitoral 2026",
      items: [
        { label: "Painel", href: "/app/eleitoral", icon: LayoutDashboard, exato: true },
        { label: "Processos", href: "/app/eleitoral/processos", icon: Gavel, badge: n(processosEleitoralTotal), badgeTone: "navy" },
        { label: "Calendário", href: "/app/eleitoral/calendario", icon: CalendarRange, badge: n(prazosEleitoralUrgentes), badgeTone: "red" },
        { label: "Monitoramento", href: "/app/eleitoral/monitoramento", icon: Activity, badge: n(deteccoesEleitoralPendentes), badgeTone: "red" },
        { label: "Relatórios", href: "/app/eleitoral/relatorios", icon: FileText },
        { label: "Gerador de prompts", href: "/app/eleitoral/prompts", icon: Wand2 },
        { label: "Links úteis", href: "/app/eleitoral/links", icon: LinkIcon },
      ],
    },
  ];

  const groupsPadrao: NavGroup[] = [
    {
      items: [
        { label: "Hoje", href: "/app", icon: Home, exato: true },
        { label: "Agenda", href: "/app/compromissos", icon: CalendarCheck, badge: n(compromissosHoje), badgeTone: "navy" },
      ],
    },
    {
      title: "Tribunal de Contas",
      items: [
        { label: "Processos", href: "/app/tce/processos", icon: Gavel, badge: n(processosTceTotal), badgeTone: "navy" },
        { label: "Painel TCE", href: "/app/tce", icon: LayoutDashboard, exato: true },
        { label: "Pauta", href: "/app/tce/pauta", icon: CalendarRange },
        { label: "Prazos", href: "/app/tce/prazos", icon: CalendarClock, badge: n(prazosTceUrgentes), badgeTone: "red" },
        { label: "Pendências", href: "/app/tce/pendencias", icon: ListChecks },
        { label: "Despachos", href: "/app/tce/despachos", icon: ClipboardCheck, badge: n(despachosTcePendentes), badgeTone: "navy" },
        { label: "Órgãos e entidades", href: "/app/tce/municipios", icon: Building2 },
        { label: "Interessados", href: "/app/tce/interessados", icon: UserCheck },
      ],
    },
    {
      title: "Judicial",
      items: [
        { label: "Processos", href: "/app/processos", icon: Scale },
        { label: "Painel judicial", href: "/app/judicial", icon: LayoutDashboard, exato: true },
        { label: "Novidades", href: "/app/monitoramento", icon: Activity, badge: n(alertasMonitoramento), badgeTone: "navy" },
        { label: "Prazos", href: "/app/prazos", icon: CalendarClock, badge: n(prazosUrgentes), badgeTone: "red" },
        { label: "Pautas", href: "/app/pautas", icon: CalendarRange, badge: n(pautasJudiciaisTotal), badgeTone: "navy" },
        { label: "Gestores", href: "/app/gestores", icon: Users },
      ],
    },
    {
      title: "Escritório",
      items: [
        { label: "Relatórios", href: "/app/relatorios", icon: BarChart3 },
        ...(podeFinanceiro ? [{ label: "Financeiro", href: "/app/financeiro", icon: DollarSign }] : []),
        { label: "Modelos de peça", href: "/app/prompts", icon: Wand2 },
        { label: "Simulador de direitos", href: "/app/simulador", icon: Calculator },
        ...(isAdmin ? [{ label: "Registro de atividades", href: "/app/admin/logs", icon: History }] : []),
      ],
    },
  ];

  const groups = modoEleitoral ? groupsEleitoral : groupsPadrao;
  const ativo = (item: NavItem) =>
    item.exato ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <div className="flex h-full flex-col border-r border-border bg-white text-brand-tinta">
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy font-serif text-lg font-semibold text-white">
          {modoEleitoral ? "E" : "G"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">
            {modoEleitoral ? "Eleitoral" : "Gestão Processual"}
          </p>
          <p className="text-xs leading-tight text-muted-foreground">
            {modoEleitoral ? "TRE-PE 2026" : "Painel jurídico"}
          </p>
        </div>
      </div>

      {onOpenSearch && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Buscar (Ctrl+K)"
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:border-slate-300"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Buscar processo, órgão ou pessoa
            </span>
            <kbd className="hidden rounded border border-border bg-white px-1 font-mono text-[10px] lg:inline">Ctrl K</kbd>
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3" aria-label="Menu principal">
        {groups.map((group, gi) => (
          <div key={group.title ?? `g${gi}`}>
            {group.title && (
              <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const on = ativo(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex min-h-[36px] items-center justify-between gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                      on ? "bg-accent font-semibold text-brand-navy" : "text-brand-tinta hover:bg-background",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className={cn("h-4 w-4", on ? "text-brand-navy" : "text-muted-foreground")} aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          "font-mono text-[11px] leading-none",
                          item.badgeTone === "red"
                            ? "rounded-full bg-destructive px-1.5 py-0.5 font-semibold text-white"
                            : "text-muted-foreground",
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

      <div className="border-t border-border px-3 py-3">
        <LogoutButton />
      </div>
    </div>
  );
}
