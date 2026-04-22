import Link from "next/link";
import { FileText, AlertTriangle, Gauge, Clock, Gavel } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Kpi = {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "navy" | "red" | "orange" | "slate" | "violet";
};

const toneStyles: Record<Kpi["tone"], string> = {
  navy: "border-brand-navy/20 bg-brand-navy/5 text-brand-navy",
  red: "border-red-200 bg-red-50 text-red-800",
  orange: "border-orange-200 bg-orange-50 text-orange-800",
  slate: "border-slate-300 bg-slate-100 text-slate-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
};

export function KpiCards({
  total,
  riscoAlto,
  riscoMedio,
  parados,
  emPauta,
}: {
  total: number;
  riscoAlto: number;
  riscoMedio: number;
  parados: number;
  emPauta: number;
}) {
  const kpis: Kpi[] = [
    { label: "Total de processos", value: total, href: "/app/processos", icon: FileText, tone: "navy" },
    { label: "Risco alto", value: riscoAlto, href: "/app/processos?risco=ALTO", icon: AlertTriangle, tone: "red" },
    { label: "Risco medio", value: riscoMedio, href: "/app/processos?risco=MEDIO", icon: Gauge, tone: "orange" },
    { label: "Parados (+60 dias)", value: parados, href: "/app/processos?status=parados", icon: Clock, tone: "slate" },
    { label: "Em pauta", value: emPauta, href: "/app/processos?status=em-pauta", icon: Gavel, tone: "violet" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
                  <span className="text-xs font-medium opacity-80">{kpi.label}</span>
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
