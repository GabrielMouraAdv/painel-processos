"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { BancaFilter } from "@/components/bancas/banca-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

const tribunais = ["TJPE", "TRF5", "TRF1", "STJ", "STF", "OUTRO"];
const tipos = [
  { value: "IMPROBIDADE", label: "Improbidade" },
  { value: "ACP", label: "ACP" },
  { value: "CRIMINAL", label: "Criminal" },
  { value: "ACAO_POPULAR", label: "Acao Popular" },
  { value: "MANDADO_SEGURANCA", label: "Mandado de Seguranca" },
  {
    value: "MANDADO_SEGURANCA_COLETIVO",
    label: "Mandado de Seguranca Coletivo",
  },
  { value: "HABEAS_CORPUS", label: "Habeas Corpus" },
  { value: "HABEAS_DATA", label: "Habeas Data" },
  { value: "ACAO_RESCISORIA", label: "Acao Rescisoria" },
  { value: "EXECUCAO_FISCAL", label: "Acao de Execucao Fiscal" },
  {
    value: "EXECUCAO_TITULO_EXTRAJUDICIAL",
    label: "Execucao de Titulo Extrajudicial",
  },
  { value: "CUMPRIMENTO_SENTENCA", label: "Cumprimento de Sentenca" },
  { value: "ACAO_ORDINARIA", label: "Acao Ordinaria" },
  { value: "ACAO_DECLARATORIA", label: "Acao Declaratoria" },
  { value: "ACAO_ANULATORIA", label: "Acao Anulatoria" },
  { value: "EMBARGOS_EXECUCAO", label: "Embargos a Execucao" },
  { value: "EMBARGOS_TERCEIRO", label: "Embargos de Terceiro" },
  { value: "RECLAMACAO", label: "Reclamacao" },
  { value: "CONFLITO_COMPETENCIA", label: "Conflito de Competencia" },
  { value: "MEDIDA_CAUTELAR", label: "Medida Cautelar" },
  {
    value: "TUTELA_CAUTELAR_ANTECEDENTE",
    label: "Tutela Cautelar Antecedente",
  },
  { value: "PROCEDIMENTO_COMUM", label: "Procedimento Comum" },
  { value: "JUIZADO_ESPECIAL", label: "Procedimento do Juizado Especial" },
  { value: "OUTRO", label: "Outro" },
];
const riscos = [
  { value: "ALTO", label: "Alto" },
  { value: "MEDIO", label: "Medio" },
  { value: "BAIXO", label: "Baixo" },
];
const graus = [
  { value: "PRIMEIRO", label: "1o Grau" },
  { value: "SEGUNDO", label: "2o Grau" },
  { value: "SUPERIOR", label: "Superiores" },
];

export function ProcessosFilters() {
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

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm">
      <form onSubmit={aplicarBusca} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
            placeholder="Buscar por numero, gestor ou entidade..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Select
          value={searchParams.get("tribunal") ?? ALL}
          onValueChange={(v) => pushWith("tribunal", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tribunal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tribunais</SelectItem>
            {tribunais.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("tipo") ?? ALL}
          onValueChange={(v) => pushWith("tipo", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os tipos</SelectItem>
            {tipos.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("risco") ?? ALL}
          onValueChange={(v) => pushWith("risco", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Risco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os riscos</SelectItem>
            {riscos.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("grau") ?? ALL}
          onValueChange={(v) => pushWith("grau", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Grau" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os graus</SelectItem>
            {graus.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
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

      <BancaFilter />
    </div>
  );
}
