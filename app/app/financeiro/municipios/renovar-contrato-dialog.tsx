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
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/financeiro";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contratoId: string;
  municipioNome: string;
  valorMensalAtual: number;
  dataFimAtual: string | null;
  onSuccess: () => void;
};

export function RenovarContratoDialog({
  open,
  onOpenChange,
  contratoId,
  municipioNome,
  valorMensalAtual,
  dataFimAtual,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [novaDataFim, setNovaDataFim] = React.useState("");
  const [novoValor, setNovoValor] = React.useState("");
  const [novaDataRenovacao, setNovaDataRenovacao] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setNovaDataFim("");
      setNovoValor(String(valorMensalAtual));
      setNovaDataRenovacao("");
    }
  }, [open, valorMensalAtual]);

  async function salvar() {
    if (!novaDataFim) {
      toast({
        variant: "destructive",
        title: "Nova data de fim obrigatoria",
      });
      return;
    }
    const valorTrim = novoValor.trim();
    let valorNum: number | undefined;
    if (valorTrim) {
      const limpo = valorTrim
        .replace(/\s+/g, "")
        .replace(/[R$]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const n = Number(limpo);
      if (!Number.isFinite(n) || n <= 0) {
        toast({ variant: "destructive", title: "Novo valor mensal invalido" });
        return;
      }
      valorNum = n;
    }

    setPending(true);
    try {
      const res = await fetch(
        `/api/financeiro/contratos/${contratoId}/renovar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            novaDataFim,
            novoValorMensal: valorNum,
            novaDataRenovacao: novaDataRenovacao || null,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao renovar",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({
        title: "Contrato renovado",
        description:
          json.notasGeradas > 0
            ? `${json.notasGeradas} nota(s) geradas para o novo periodo.`
            : "Nenhuma nota nova gerada.",
      });
      onOpenChange(false);
      onSuccess();
    } catch (e) {
      console.error("[renovar contrato] erro:", e);
      toast({
        variant: "destructive",
        title: "Erro de conexao",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Renovar contrato — {municipioNome}</DialogTitle>
          <DialogDescription>
            Estende o prazo do contrato e gera as notas mensais ate a nova data
            de fim.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
            <p>
              Valor mensal atual: <strong>{formatBRL(valorMensalAtual)}</strong>
            </p>
            <p>
              Data fim atual:{" "}
              <strong>
                {dataFimAtual
                  ? new Date(dataFimAtual).toLocaleDateString("pt-BR")
                  : "sem data fim"}
              </strong>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>
              Nova data de fim <span className="text-red-600">*</span>
            </Label>
            <Input
              type="date"
              value={novaDataFim}
              onChange={(e) => setNovaDataFim(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Deve ser posterior a data de fim atual.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Novo valor mensal (R$)</Label>
            <Input
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              placeholder={String(valorMensalAtual)}
            />
            <p className="text-[11px] text-muted-foreground">
              Deixe igual ao atual se nao houver reajuste.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Proxima data de renovacao (opcional)</Label>
            <Input
              type="date"
              value={novaDataRenovacao}
              onChange={(e) => setNovaDataRenovacao(e.target.value)}
            />
          </div>
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
            {pending ? "Renovando..." : "Renovar contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
