import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  FileText,
  Gavel,
  Scale,
  StickyNote,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Kpi = {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "navy" | "red" | "orange" | "slate" | "violet" | "emerald";
};

const toneStyles: Record<Kpi["tone"], string> = {
  navy: "border-brand-navy/20 bg-brand-navy/5 text-brand-navy",
  red: "border-red-200 bg-red-50 text-red-800",
  orange: "border-orange-200 bg-orange-50 text-orange-800",
  slate: "border-slate-300 bg-slate-100 text-slate-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function KpiCardsTce({
  total,
  comPrazoAberto,
  emPauta,
  semDespacho,
  memoriaisPendentes,
  contrarrazoesPendentes,
}: {
  total: number;
  comPrazoAberto: number;
  emPauta: number;
  semDespacho: number;
  memoriaisPendentes: number;
  contrarrazoesPendentes: number;
}) {
  const kpis: Kpi[] = [
    {
      label: "Total",
      value: total,
      href: "/app/tce/processos",
      icon: FileText,
      tone: "navy",
    },
    {
      label: "Com prazo aberto",
      value: comPrazoAberto,
      href: "/app/tce/processos?prazo=aberto",
      icon: CalendarClock,
      tone: "red",
    },
    {
      label: "Em pauta",
      value: emPauta,
      href: "/app/tce/processos?pauta=1",
      icon: Gavel,
      tone: "violet",
    },
    {
      label: "Sem despacho",
      value: semDespacho,
      href: "/app/tce/processos?semDespacho=1",
      icon: AlertTriangle,
      tone: "orange",
    },
    {
      label: "Memoriais pendentes",
      value: memoriaisPendentes,
      href: "/app/tce/processos?memorial=pendente",
      icon: StickyNote,
      tone: "slate",
    },
    {
      label: "Contrarrazoes pendentes",
      value: contrarrazoesPendentes,
      href: "/app/tce/processos?contrarrazoes=pendentes",
      icon: Scale,
      tone: "emerald",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Link key={kpi.label} href={kpi.href}>
            <Card
              className={cn(
                "h-full cursor-pointer border transition-all hover:shadow-md",
                toneStyles[kpi.tone],
              )}
            >
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium opacity-80">
                    {kpi.label}
                  </span>
                  <Icon className="h-4 w-4 opacity-70" aria-hidden="true" />
                </div>
                <div className="text-3xl font-semibold">{kpi.value}</div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
