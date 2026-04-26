"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TCE_CAMARA_LABELS, TCE_TIPO_LABELS, todasFasesTce } from "@/lib/tce-config";

const ALL = "__all__";

type Opt = { id: string; label: string };

type Props = {
  municipios: Opt[];
  interessados: Opt[];
  relatores: string[];
};

export function ProcessosTceFilters({
  municipios,
  interessados,
  relatores,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [buscaLocal, setBuscaLocal] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setBuscaLocal(searchParams.get("q") ?? "");
  }, [searchParams]);

  function pushWith(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function aplicarBusca(e?: React.FormEvent) {
    e?.preventDefault();
    pushWith("q", buscaLocal.trim() || null);
  }

  function limpar() {
    router.push(pathname);
  }

  const temFiltros =
    Array.from(searchParams.keys()).filter((k) => k !== "page").length > 0;

  const fases = todasFasesTce();

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm">
      <form onSubmit={aplicarBusca} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
            placeholder="Buscar por numero, relator ou objeto..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Select
          value={searchParams.get("tipo") ?? ALL}
          onValueChange={(v) => pushWith("tipo", v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            {Object.entries(TCE_TIPO_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("camara") ?? ALL}
          onValueChange={(v) => pushWith("camara", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Camara" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as camaras</SelectItem>
            {Object.entries(TCE_CAMARA_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("relator") ?? ALL}
          onValueChange={(v) => pushWith("relator", v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Relator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os relatores</SelectItem>
            {relatores.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("municipioId") ?? ALL}
          onValueChange={(v) => pushWith("municipioId", v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Municipio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os municipios</SelectItem>
            {municipios.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("interessadoId") ?? ALL}
          onValueChange={(v) => pushWith("interessadoId", v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Interessado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos interessados</SelectItem>
            {interessados.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("fase") ?? ALL}
          onValueChange={(v) => pushWith("fase", v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as fases</SelectItem>
            {fases.map((f) => (
              <SelectItem key={f.key} value={f.key}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("julgamento") ?? ALL}
          onValueChange={(v) => pushWith("julgamento", v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status Julgamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="julgados">Julgados</SelectItem>
            <SelectItem value="nao_julgados">Nao Julgados</SelectItem>
          </SelectContent>
        </Select>

        {temFiltros && (
          <Button type="button" variant="ghost" onClick={limpar} className="ml-auto">
            <X className="mr-1 h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </div>
    </div>
  );
}
