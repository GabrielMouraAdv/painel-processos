"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  de: string;
  ate: string;
};

export function PeriodoFilter({ de: initialDe, ate: initialAte }: Props) {
  const router = useRouter();
  const [de, setDe] = React.useState(initialDe);
  const [ate, setAte] = React.useState(initialAte);

  function apply() {
    const params = new URLSearchParams();
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    const qs = params.toString();
    router.push(qs ? `/app/relatorios?${qs}` : "/app/relatorios");
  }

  function clearAll() {
    setDe("");
    setAte("");
    router.push("/app/relatorios");
  }

  const csvHref = (() => {
    const params = new URLSearchParams();
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    const qs = params.toString();
    return qs ? `/api/relatorios/csv?${qs}` : "/api/relatorios/csv";
  })();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-[140px] flex-col gap-1">
        <Label className="text-xs">Inicio</Label>
        <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
      </div>
      <div className="flex min-w-[140px] flex-col gap-1">
        <Label className="text-xs">Fim</Label>
        <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
      </div>
      <Button onClick={apply} className="bg-brand-navy hover:bg-brand-navy/90">
        Aplicar
      </Button>
      <Button variant="ghost" onClick={clearAll}>
        Limpar
      </Button>
      <div className="ml-auto">
        <Button asChild variant="outline">
          <a href={csvHref} download>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </a>
        </Button>
      </div>
    </div>
  );
}
