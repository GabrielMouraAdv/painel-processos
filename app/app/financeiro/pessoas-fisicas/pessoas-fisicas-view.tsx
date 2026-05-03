"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TipoHonorario } from "@prisma/client";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { BancaBadgeList } from "@/components/bancas/banca-badge";
import { BancaFilter } from "@/components/bancas/banca-filter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ANOS_DISPONIVEIS,
  formatBRL,
  TIPO_HONORARIO_LABELS,
} from "@/lib/financeiro";
import { cn } from "@/lib/utils";

import { HonorarioPessoalDialog, type HonorarioParaEditar } from "./honorario-pessoal-dialog";

export type HonorarioRow = {
  id: string;
  clienteNome: string;
  clienteCpf: string | null;
  bancasSlug: string[];
  tipoHonorario: TipoHonorario;
  descricaoCausa: string;
  valorTotal: number;
  dataContrato: string;
  dataVencimento: string | null;
  pago: boolean;
  dataPagamento: string | null;
  valorPago: number | null;
  observacoes: string | null;
};

type Filters = { ano: string; tipo: TipoHonorario | ""; status: string };

type Props = {
  honorarios: HonorarioRow[];
  initialFilters: Filters;
  isAdmin?: boolean;
  bancaUsuario?: string | null;
};

const ALL = "__all__";

export function PessoasFisicasView({
  honorarios,
  initialFilters,
  isAdmin = false,
  bancaUsuario = null,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [novoOpen, setNovoOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<HonorarioParaEditar | null>(null);

  function pushFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function statusDe(h: HonorarioRow): "PAGO" | "VENCIDO" | "ABERTO" {
    if (h.pago) return "PAGO";
    if (h.dataVencimento && new Date(h.dataVencimento) < new Date()) {
      return "VENCIDO";
    }
    return "ABERTO";
  }

  async function excluir(h: HonorarioRow) {
    if (!window.confirm(`Excluir honorario de ${h.clienteNome}?`)) return;
    const res = await fetch(`/api/financeiro/honorarios-pessoais/${h.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: json.error,
      });
      return;
    }
    toast({ title: "Honorario excluido" });
    router.refresh();
  }

  const totais = React.useMemo(() => {
    let totalGeral = 0;
    let totalPago = 0;
    let totalAberto = 0;
    let totalVencido = 0;
    for (const h of honorarios) {
      totalGeral += h.valorTotal;
      const s = statusDe(h);
      if (s === "PAGO") totalPago += h.valorPago ?? h.valorTotal;
      else if (s === "VENCIDO") totalVencido += h.valorTotal;
      else totalAberto += h.valorTotal;
    }
    return { totalGeral, totalPago, totalAberto, totalVencido };
  }, [honorarios]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Financeiro
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Honorarios Pessoais
          </h1>
          <p className="text-sm text-muted-foreground">
            Honorarios contratados por causa, sucumbencia ou outros.
          </p>
        </div>
        <Button onClick={() => setNovoOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Cadastrar Honorario
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total" valor={formatBRL(totais.totalGeral)} tone="navy" />
        <Stat
          label="Pago"
          valor={formatBRL(totais.totalPago)}
          tone="emerald"
        />
        <Stat
          label="A Pagar"
          valor={formatBRL(totais.totalAberto)}
          tone="amber"
        />
        <Stat
          label="Vencido"
          valor={formatBRL(totais.totalVencido)}
          tone="red"
        />
      </section>

      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[140px] flex-col gap-1">
            <Label className="text-xs">Ano</Label>
            <Select
              value={initialFilters.ano || ALL}
              onValueChange={(v) =>
                pushFilter("ano", v === ALL ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os anos</SelectItem>
                {ANOS_DISPONIVEIS.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <Label className="text-xs">Tipo</Label>
            <Select
              value={initialFilters.tipo || ALL}
              onValueChange={(v) =>
                pushFilter("tipo", v === ALL ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os tipos</SelectItem>
                {Object.entries(TIPO_HONORARIO_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[140px] flex-col gap-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={initialFilters.status || ALL}
              onValueChange={(v) =>
                pushFilter("status", v === ALL ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                <SelectItem value="aberto">A pagar</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {isAdmin && <BancaFilter />}
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Banca(s)</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Causa</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Contrato</th>
                <th className="px-3 py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {honorarios.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Nenhum honorario encontrado.
                  </td>
                </tr>
              ) : (
                honorarios.map((h) => {
                  const s = statusDe(h);
                  const statusLabel =
                    s === "PAGO"
                      ? "Pago"
                      : s === "VENCIDO"
                        ? "Vencido"
                        : "A pagar";
                  const statusClass =
                    s === "PAGO"
                      ? "bg-emerald-100 text-emerald-800"
                      : s === "VENCIDO"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-900";
                  return (
                    <tr key={h.id} className="border-b last:border-b-0 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-medium">{h.clienteNome}</div>
                        {h.clienteCpf && (
                          <div className="text-[11px] text-muted-foreground">
                            CPF {h.clienteCpf}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <BancaBadgeList slugs={h.bancasSlug} size="sm" max={3} />
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {TIPO_HONORARIO_LABELS[h.tipoHonorario]}
                      </td>
                      <td className="max-w-[300px] px-3 py-2 text-xs text-slate-700">
                        {h.descricaoCausa}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatBRL(h.valorTotal)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            statusClass,
                          )}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {new Date(h.dataContrato).toLocaleDateString("pt-BR")}
                        {h.pago && h.dataPagamento && (
                          <div className="text-[10px] text-emerald-700">
                            Pago em {new Date(h.dataPagamento).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            setEditing({
                              id: h.id,
                              clienteNome: h.clienteNome,
                              clienteCpf: h.clienteCpf,
                              bancasSlug: h.bancasSlug,
                              tipoHonorario: h.tipoHonorario,
                              descricaoCausa: h.descricaoCausa,
                              valorTotal: h.valorTotal,
                              dataContrato: h.dataContrato,
                              dataVencimento: h.dataVencimento,
                              pago: h.pago,
                              dataPagamento: h.dataPagamento,
                              valorPago: h.valorPago,
                              observacoes: h.observacoes,
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-700 hover:bg-red-50"
                          onClick={() => excluir(h)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HonorarioPessoalDialog
        open={novoOpen || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setNovoOpen(false);
            setEditing(null);
          }
        }}
        editing={editing}
        bancaFixa={isAdmin ? null : bancaUsuario}
        onSuccess={() => {
          setNovoOpen(false);
          setEditing(null);
          router.refresh();
        }}
      />
    </>
  );
}

function Stat({
  label,
  valor,
  tone,
}: {
  label: string;
  valor: string;
  tone: "navy" | "emerald" | "amber" | "red";
}) {
  const cls: Record<string, string> = {
    navy: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
  };
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-lg border p-3", cls[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="text-lg font-bold">{valor}</p>
    </div>
  );
}
