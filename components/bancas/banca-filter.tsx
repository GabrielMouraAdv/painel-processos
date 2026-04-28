"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

import { cn } from "@/lib/utils";
import { BANCAS, bancaBadgeClasses } from "@/lib/bancas";

type Props = {
  // Nome do query param (default: "banca")
  paramName?: string;
  // Texto da label (default: "Banca")
  label?: string;
  // Reseta paginacao ao mudar (default: true)
  resetPage?: boolean;
  className?: string;
};

export function BancaFilter({
  paramName = "banca",
  label = "Banca",
  resetPage = true,
  className,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Le selecionados atuais (suporta CSV)
  const selecionados = new Set(
    (searchParams.get(paramName) ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  function aplicar(novosSlugs: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (novosSlugs.length === 0) {
      params.delete(paramName);
    } else {
      params.set(paramName, novosSlugs.join(","));
    }
    if (resetPage) params.delete("page");
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?", { scroll: false });
  }

  function toggle(slug: string) {
    const novos = new Set(selecionados);
    if (novos.has(slug)) novos.delete(slug);
    else novos.add(slug);
    aplicar(Array.from(novos));
  }

  function limpar() {
    aplicar([]);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Filter className="h-3 w-3" aria-hidden="true" />
          {label}
        </span>
        {selecionados.size > 0 && (
          <button
            type="button"
            onClick={limpar}
            className="text-[10px] text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            Limpar
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {BANCAS.map((b) => {
          const ativo = selecionados.has(b.slug);
          return (
            <button
              key={b.slug}
              type="button"
              onClick={() => toggle(b.slug)}
              aria-pressed={ativo}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 transition-colors",
                ativo
                  ? bancaBadgeClasses(b.cor)
                  : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 hover:text-slate-700",
              )}
              title={
                b.advogado
                  ? `${b.nome} — ${b.advogado}${b.oab ? ` (${b.oab})` : ""}`
                  : b.nome
              }
            >
              {b.nome}
            </button>
          );
        })}
      </div>
    </div>
  );
}
