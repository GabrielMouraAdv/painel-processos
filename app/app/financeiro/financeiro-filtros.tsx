"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { BancaFilter } from "@/components/bancas/banca-filter";
import { ANOS_DISPONIVEIS } from "@/lib/financeiro";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  anoSelecionado: number;
  mostrarFiltroBanca?: boolean;
};

export function FinanceiroFiltros({
  anoSelecionado,
  mostrarFiltroBanca = true,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setAno(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ano", v);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[140px] flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Ano</label>
          <Select value={String(anoSelecionado)} onValueChange={setAno}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANOS_DISPONIVEIS.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {mostrarFiltroBanca && <BancaFilter />}
    </div>
  );
}
