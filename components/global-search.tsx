"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  Gavel,
  Loader2,
  Scale,
  Search,
  UserCheck,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type ResultadoBusca = {
  tipo:
    | "processo_tce"
    | "processo_judicial"
    | "subprocesso_tce"
    | "gestor"
    | "municipio";
  id: string;
  numero: string;
  label: string;
  contexto: string | null;
  href: string;
};

type Grupo = {
  tipo: ResultadoBusca["tipo"];
  titulo: string;
  resultados: ResultadoBusca[];
};

const ORDEM: ResultadoBusca["tipo"][] = [
  "processo_tce",
  "processo_judicial",
  "subprocesso_tce",
  "gestor",
  "municipio",
];

const TITULOS: Record<ResultadoBusca["tipo"], string> = {
  processo_tce: "Processos TCE",
  processo_judicial: "Processos Judiciais",
  subprocesso_tce: "Subprocessos TCE",
  gestor: "Gestores",
  municipio: "Municipios",
};

function IconePorTipo({ tipo }: { tipo: ResultadoBusca["tipo"] }) {
  const cls = "h-4 w-4 shrink-0";
  switch (tipo) {
    case "processo_tce":
      return <Gavel className={cn(cls, "text-brand-navy")} />;
    case "processo_judicial":
      return <Scale className={cn(cls, "text-brand-navy")} />;
    case "subprocesso_tce":
      return <FileText className={cn(cls, "text-purple-700")} />;
    case "gestor":
      return <UserCheck className={cn(cls, "text-emerald-700")} />;
    case "municipio":
      return <Building2 className={cn(cls, "text-amber-700")} />;
  }
}

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState("");
  const [resultados, setResultados] = React.useState<ResultadoBusca[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState(0);

  // Lista plana de resultados na ordem que serao renderizados (para nav teclado)
  const flat = React.useMemo(() => {
    const grupos: Grupo[] = ORDEM.map((tipo) => ({
      tipo,
      titulo: TITULOS[tipo],
      resultados: resultados.filter((r) => r.tipo === tipo),
    })).filter((g) => g.resultados.length > 0);
    const lista: ResultadoBusca[] = [];
    for (const g of grupos) lista.push(...g.resultados);
    return { grupos, lista };
  }, [resultados]);

  // Reseta state ao abrir/fechar
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setResultados([]);
      setSelected(0);
      // Foca o input apos o modal entrar no DOM
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Debounce 300ms da busca
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length === 0) {
      setResultados([]);
      setLoading(false);
      return;
    }
    let cancelado = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/busca-global?q=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          if (!cancelado) {
            setResultados([]);
            setLoading(false);
          }
          return;
        }
        const json = (await res.json()) as { resultados: ResultadoBusca[] };
        if (!cancelado) {
          setResultados(json.resultados ?? []);
          setSelected(0);
          setLoading(false);
        }
      } catch {
        if (!cancelado) {
          setResultados([]);
          setLoading(false);
        }
      }
    }, 300);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [query, open]);

  // Scroll para o item selecionado
  React.useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.querySelector<HTMLElement>(
      `[data-index="${selected}"]`,
    );
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [selected, open]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
      return;
    }
    if (flat.lista.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (s + 1) % flat.lista.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (s - 1 + flat.lista.length) % flat.lista.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat.lista[selected];
      if (item) {
        onOpenChange(false);
        router.push(item.href);
      }
    }
  }

  function abrir(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  if (!open) return null;

  const queryVazia = query.trim().length === 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-[10vh] sm:pt-[15vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Busca global"
    >
      <div
        className="flex w-full max-w-[600px] flex-col overflow-hidden rounded-xl border bg-white shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por numero do processo, gestor, municipio..."
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          )}
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-muted-foreground hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto"
          role="listbox"
          aria-label="Resultados"
        >
          {queryVazia ? (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <Search className="mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Digite para buscar processos, gestores ou municipios...
              </p>
            </div>
          ) : !loading && flat.lista.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          ) : (
            <div className="py-2">
              {flat.grupos.map((g) => {
                let baseIndex = 0;
                for (const outro of flat.grupos) {
                  if (outro === g) break;
                  baseIndex += outro.resultados.length;
                }
                return (
                  <div key={g.tipo} className="pb-2">
                    <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {g.titulo}
                    </p>
                    <div>
                      {g.resultados.map((r, i) => {
                        const idx = baseIndex + i;
                        const ativo = idx === selected;
                        return (
                          <button
                            key={`${r.tipo}-${r.id}`}
                            type="button"
                            data-index={idx}
                            role="option"
                            aria-selected={ativo}
                            onMouseEnter={() => setSelected(idx)}
                            onClick={() => abrir(r.href)}
                            className={cn(
                              "flex w-full items-start gap-3 px-4 py-2 text-left transition-colors",
                              ativo ? "bg-brand-navy/10" : "hover:bg-slate-50",
                            )}
                          >
                            <div className="mt-0.5">
                              <IconePorTipo tipo={r.tipo} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "truncate text-sm",
                                  r.tipo === "gestor" ||
                                    r.tipo === "municipio"
                                    ? "font-medium text-slate-800"
                                    : "font-mono font-semibold text-brand-navy",
                                )}
                              >
                                {r.numero}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {r.label}
                                {r.contexto ? ` • ${r.contexto}` : ""}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 border-t bg-slate-50 px-4 py-2 text-[11px] text-muted-foreground sm:flex">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono">
              ↑↓
            </kbd>
            navegar
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono">
              Enter
            </kbd>
            abrir
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border bg-white px-1.5 py-0.5 font-mono">
              Esc
            </kbd>
            fechar
          </span>
        </div>
      </div>
    </div>
  );
}
