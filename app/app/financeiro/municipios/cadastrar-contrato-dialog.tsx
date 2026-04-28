"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BANCAS, bancaBadgeClasses } from "@/lib/bancas";
import { cn } from "@/lib/utils";

type MunicipioOpt = { id: string; nome: string; uf: string };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  municipios: MunicipioOpt[];
  onSuccess: () => void;
};

export function CadastrarContratoDialog({
  open,
  onOpenChange,
  municipios,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [busca, setBusca] = React.useState("");
  const [municipioId, setMunicipioId] = React.useState("");
  const [bancas, setBancas] = React.useState<Set<string>>(new Set());
  const [valorMensal, setValorMensal] = React.useState("");
  const [dataInicio, setDataInicio] = React.useState("");
  const [dataFim, setDataFim] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [gerarNotas, setGerarNotas] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      setBusca("");
      setMunicipioId("");
      setBancas(new Set());
      setValorMensal("");
      setDataInicio("");
      setDataFim("");
      setObservacoes("");
      setGerarNotas(true);
    }
  }, [open]);

  function toggleBanca(slug: string) {
    setBancas((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const municipiosFiltrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return municipios.slice(0, 30);
    return municipios
      .filter((m) => m.nome.toLowerCase().includes(q))
      .slice(0, 30);
  }, [busca, municipios]);

  async function salvar() {
    if (!municipioId) {
      toast({ variant: "destructive", title: "Selecione o municipio" });
      return;
    }
    if (bancas.size === 0) {
      toast({
        variant: "destructive",
        title: "Selecione pelo menos uma banca",
      });
      return;
    }
    const valor = Number(valorMensal.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) {
      toast({ variant: "destructive", title: "Valor mensal invalido" });
      return;
    }
    if (!dataInicio) {
      toast({ variant: "destructive", title: "Data de inicio obrigatoria" });
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/financeiro/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          municipioId,
          bancasSlug: Array.from(bancas),
          valorMensal: valor,
          dataInicio,
          dataFim: dataFim || null,
          observacoes: observacoes.trim() || null,
          gerarNotasAutomaticas: gerarNotas,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao cadastrar contrato",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({
        title: "Contrato cadastrado",
        description:
          json.notasGeradas > 0
            ? `${json.notasGeradas} nota(s) geradas automaticamente.`
            : undefined,
      });
      onOpenChange(false);
      onSuccess();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Cadastrar contrato municipal</DialogTitle>
          <DialogDescription>
            Honorario contratual mensal. As notas serao geradas
            automaticamente desde a data de inicio ate dezembro do ano corrente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>
              Municipio <span className="text-red-600">*</span>
            </Label>
            <Input
              placeholder="Buscar municipio por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto rounded-md border">
              {municipiosFiltrados.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMunicipioId(m.id)}
                  className={cn(
                    "block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50",
                    municipioId === m.id &&
                      "bg-blue-50 font-semibold text-blue-900",
                  )}
                >
                  {m.nome}/{m.uf}
                </button>
              ))}
              {municipiosFiltrados.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">
                  Nenhum municipio encontrado.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Bancas <span className="text-red-600">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {BANCAS.map((b) => {
                const ativo = bancas.has(b.slug);
                return (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => toggleBanca(b.slug)}
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
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>
                Valor mensal (R$) <span className="text-red-600">*</span>
              </Label>
              <Input
                placeholder="0,00"
                value={valorMensal}
                onChange={(e) => setValorMensal(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Data inicio <span className="text-red-600">*</span>
              </Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data fim (opcional)</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={gerarNotas}
              onChange={(e) => setGerarNotas(e.target.checked)}
            />
            <span>
              Gerar notas automaticamente desde a data de inicio ate dezembro
              do ano corrente
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
