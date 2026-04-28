"use client";

import * as React from "react";
import { FileDown, Loader2, Search, Users, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BANCAS, bancaBadgeClasses } from "@/lib/bancas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESCRITORIOS_EMISSORES } from "@/lib/escritorios-emissores";
import { cn } from "@/lib/utils";

export type GestorOption = {
  id: string;
  nome: string;
  cargo: string;
  municipio: string;
};

export type MunicipioOption = {
  id: string;
  nome: string;
  uf: string;
};

type Props = {
  gestores: GestorOption[];
  municipios: MunicipioOption[];
};

type Tipo = "gestor" | "municipio";
type Status = "ativos" | "todos";

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function ClienteForm({ gestores, municipios }: Props) {
  const [tipo, setTipo] = React.useState<Tipo>("gestor");
  const [busca, setBusca] = React.useState("");
  const [clienteId, setClienteId] = React.useState("");
  const [incluirJudicial, setIncluirJudicial] = React.useState(true);
  const [incluirTce, setIncluirTce] = React.useState(true);
  const [status, setStatus] = React.useState<Status>("ativos");
  const [emissorSlug, setEmissorSlug] = React.useState<string>("");
  const [advogadoIdx, setAdvogadoIdx] = React.useState<number>(0);
  const [bancas, setBancas] = React.useState<Set<string>>(new Set());
  const [erro, setErro] = React.useState<string | null>(null);
  const [gerando, setGerando] = React.useState(false);

  function toggleBanca(slug: string) {
    setBancas((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const emissorAtual = React.useMemo(
    () => ESCRITORIOS_EMISSORES.find((e) => e.slug === emissorSlug) ?? null,
    [emissorSlug],
  );

  function trocarEmissor(slug: string) {
    setEmissorSlug(slug);
    setAdvogadoIdx(0);
  }

  const lista = React.useMemo(() => {
    const src = tipo === "gestor" ? gestores : municipios;
    const q = normalizar(busca.trim());
    if (!q) return src.slice(0, 50);
    return src
      .filter((c) => {
        if (tipo === "gestor") {
          const g = c as GestorOption;
          return (
            normalizar(g.nome).includes(q) ||
            normalizar(g.cargo).includes(q) ||
            normalizar(g.municipio).includes(q)
          );
        }
        const m = c as MunicipioOption;
        return (
          normalizar(m.nome).includes(q) || normalizar(m.uf).includes(q)
        );
      })
      .slice(0, 50);
  }, [tipo, busca, gestores, municipios]);

  const clienteSelecionado = React.useMemo(() => {
    if (!clienteId) return null;
    if (tipo === "gestor") {
      const g = gestores.find((x) => x.id === clienteId);
      if (!g) return null;
      return {
        nome: g.nome,
        detalhe: `${g.cargo} — ${g.municipio}`,
      };
    }
    const m = municipios.find((x) => x.id === clienteId);
    if (!m) return null;
    return {
      nome: `${m.nome}/${m.uf}`,
      detalhe: "Municipio",
    };
  }, [clienteId, tipo, gestores, municipios]);

  function trocarTipo(t: Tipo) {
    setTipo(t);
    setClienteId("");
    setBusca("");
    setErro(null);
  }

  async function gerar() {
    setErro(null);
    if (!clienteId) {
      setErro("Selecione um cliente.");
      return;
    }
    if (!incluirJudicial && !incluirTce) {
      setErro("Selecione ao menos um modulo.");
      return;
    }
    if (!emissorAtual) {
      setErro("Selecione o escritorio responsavel.");
      return;
    }

    const params = new URLSearchParams({
      tipo,
      id: clienteId,
      judicial: String(incluirJudicial),
      tce: String(incluirTce),
      status,
      emissor: emissorAtual.slug,
      advogado: String(advogadoIdx),
    });
    if (bancas.size > 0) {
      params.set("banca", Array.from(bancas).join(","));
    }

    setGerando(true);
    try {
      const res = await fetch(`/api/relatorios/cliente-pdf?${params}`, {
        method: "GET",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Falha ao gerar PDF");
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = /filename="([^"]+)"/i.exec(cd);
      const filename = match?.[1] ?? "relatorio.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro inesperado";
      setErro(msg);
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tipo cliente */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Tipo de cliente
        </Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => trocarTipo("gestor")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors",
              tipo === "gestor"
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            <Users className="h-4 w-4" />
            Gestor
          </button>
          <button
            type="button"
            onClick={() => trocarTipo("municipio")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors",
              tipo === "municipio"
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            <Building2 className="h-4 w-4" />
            Municipio
          </button>
        </div>
      </div>

      {/* Cliente */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Cliente
        </Label>
        {clienteSelecionado ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-brand-navy/30 bg-brand-navy/5 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-brand-navy">
                {clienteSelecionado.nome}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {clienteSelecionado.detalhe}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setClienteId("")}
              className="shrink-0"
            >
              Trocar
            </Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={
                  tipo === "gestor"
                    ? "Buscar gestor por nome, cargo ou municipio..."
                    : "Buscar municipio..."
                }
                className="pl-9"
              />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border bg-white">
              {lista.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {tipo === "gestor"
                    ? "Nenhum gestor encontrado."
                    : "Nenhum municipio encontrado."}
                </p>
              ) : (
                <ul className="divide-y">
                  {lista.map((c) => {
                    if (tipo === "gestor") {
                      const g = c as GestorOption;
                      return (
                        <li key={g.id}>
                          <button
                            type="button"
                            onClick={() => setClienteId(g.id)}
                            className="flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                          >
                            <span className="font-medium text-brand-navy">
                              {g.nome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {g.cargo} — {g.municipio}
                            </span>
                          </button>
                        </li>
                      );
                    }
                    const m = c as MunicipioOption;
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => setClienteId(m.id)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                        >
                          <span className="font-medium text-brand-navy">
                            {m.nome}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {m.uf}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modulos */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Modulos
        </Label>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={incluirJudicial}
              onChange={(e) => setIncluirJudicial(e.target.checked)}
            />
            Processos Judiciais
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={incluirTce}
              onChange={(e) => setIncluirTce(e.target.checked)}
            />
            Processos TCE
          </label>
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Status
        </Label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatus("ativos")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              status === "ativos"
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            Apenas ativos
          </button>
          <button
            type="button"
            onClick={() => setStatus("todos")}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              status === "todos"
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            Todos (incluindo encerrados)
          </button>
        </div>
      </div>

      {/* Filtro de banca (opcional) */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Filtrar por banca (opcional)
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {BANCAS.map((b) => {
            const ativo = bancas.has(b.slug);
            return (
              <button
                key={b.slug}
                type="button"
                onClick={() => toggleBanca(b.slug)}
                aria-pressed={ativo}
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 transition-colors",
                  ativo
                    ? bancaBadgeClasses(b.cor)
                    : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50",
                )}
              >
                {b.nome}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Sem selecao = todas as bancas. Util quando o cliente tem processos
          patrocinados por mais de uma banca.
        </p>
      </div>

      {/* Escritorio responsavel */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Escritorio responsavel <span className="text-red-600">*</span>
        </Label>
        <Select value={emissorSlug} onValueChange={trocarEmissor}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o escritorio emissor" />
          </SelectTrigger>
          <SelectContent>
            {ESCRITORIOS_EMISSORES.map((e) => (
              <SelectItem key={e.slug} value={e.slug}>
                {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {emissorAtual && emissorAtual.advogados.length > 1 && (
          <div className="flex flex-col gap-2 pt-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Advogado que assina
            </Label>
            <Select
              value={String(advogadoIdx)}
              onValueChange={(v) => setAdvogadoIdx(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emissorAtual.advogados.map((a, i) => (
                  <SelectItem key={a.oab} value={String(i)}>
                    {a.nome} — {a.oab}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {emissorAtual && emissorAtual.advogados.length === 1 && (
          <p className="text-xs text-muted-foreground">
            Assina: {emissorAtual.advogados[0].nome} —{" "}
            {emissorAtual.advogados[0].oab}
          </p>
        )}
      </div>

      {erro && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <div>
        <Button
          onClick={gerar}
          disabled={gerando || !clienteId || !emissorSlug}
          className="bg-brand-navy hover:bg-brand-navy/90"
          size="lg"
        >
          {gerando ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Gerar Relatorio em PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
