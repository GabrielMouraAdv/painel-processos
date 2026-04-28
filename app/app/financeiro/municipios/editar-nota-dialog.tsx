"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

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
import { NOMES_MESES_COMPLETO } from "@/lib/financeiro";

export type NotaParaEditar = {
  id: string;
  numeroNota: string | null;
  dataEmissao: string | null;
  valorNota: number;
  dataVencimento: string;
  pago: boolean;
  dataPagamento: string | null;
  valorPago: number | null;
  observacoes: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contratoId: string;
  mes: number;
  ano: number;
  valorPadrao: number;
  nota: NotaParaEditar | null;
  onSuccess: () => void;
};

function isoDate(s: string | null): string {
  if (!s) return "";
  return s.slice(0, 10);
}

export function EditarNotaDialog({
  open,
  onOpenChange,
  contratoId,
  mes,
  ano,
  valorPadrao,
  nota,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [numeroNota, setNumeroNota] = React.useState("");
  const [dataEmissao, setDataEmissao] = React.useState("");
  const [valor, setValor] = React.useState("");
  const [dataVenc, setDataVenc] = React.useState("");
  const [pago, setPago] = React.useState(false);
  const [dataPag, setDataPag] = React.useState("");
  const [valorPago, setValorPago] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      if (nota) {
        setNumeroNota(nota.numeroNota ?? "");
        setDataEmissao(isoDate(nota.dataEmissao));
        setValor(String(nota.valorNota));
        setDataVenc(isoDate(nota.dataVencimento));
        setPago(nota.pago);
        setDataPag(isoDate(nota.dataPagamento));
        setValorPago(nota.valorPago !== null ? String(nota.valorPago) : "");
        setObservacoes(nota.observacoes ?? "");
      } else {
        // Default: vencimento dia 10 do mes seguinte
        const vencMes = mes === 12 ? 1 : mes + 1;
        const vencAno = mes === 12 ? ano + 1 : ano;
        const venc = `${vencAno}-${String(vencMes).padStart(2, "0")}-10`;
        setNumeroNota("");
        setDataEmissao("");
        setValor(String(valorPadrao));
        setDataVenc(venc);
        setPago(false);
        setDataPag("");
        setValorPago("");
        setObservacoes("");
      }
    }
  }, [open, nota, mes, ano, valorPadrao]);

  async function salvar() {
    const valorNum = Number(String(valor).replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      toast({ variant: "destructive", title: "Valor invalido" });
      return;
    }
    if (!dataVenc) {
      toast({ variant: "destructive", title: "Data de vencimento obrigatoria" });
      return;
    }
    if (pago && !dataPag) {
      toast({
        variant: "destructive",
        title: "Data de pagamento obrigatoria quando marcado como pago",
      });
      return;
    }
    const valorPagoNum = valorPago
      ? Number(String(valorPago).replace(/\./g, "").replace(",", "."))
      : null;

    const body: Record<string, unknown> = {
      numeroNota: numeroNota.trim() || null,
      dataEmissao: dataEmissao || null,
      mesReferencia: mes,
      anoReferencia: ano,
      valorNota: valorNum,
      dataVencimento: dataVenc,
      pago,
      dataPagamento: pago ? dataPag : null,
      valorPago: pago ? valorPagoNum : null,
      observacoes: observacoes.trim() || null,
    };

    setPending(true);
    try {
      let res;
      if (nota) {
        res = await fetch(`/api/financeiro/notas/${nota.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/financeiro/notas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, contratoId }),
        });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: nota ? "Erro ao atualizar" : "Erro ao criar",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: nota ? "Nota atualizada" : "Nota criada" });
      onSuccess();
    } finally {
      setPending(false);
    }
  }

  async function excluir() {
    if (!nota) return;
    if (!window.confirm("Excluir esta nota?")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/financeiro/notas/${nota.id}`, {
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
      toast({ title: "Nota excluida" });
      onSuccess();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Nota fiscal — {NOMES_MESES_COMPLETO[mes - 1]}/{ano}
          </DialogTitle>
          <DialogDescription>
            {nota ? "Editar dados da nota" : "Cadastrar nota deste mes"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Numero da nota</Label>
              <Input
                value={numeroNota}
                onChange={(e) => setNumeroNota(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de emissao</Label>
              <Input
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Valor (R$) <span className="text-red-600">*</span>
              </Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Vencimento <span className="text-red-600">*</span>
              </Label>
              <Input
                type="date"
                value={dataVenc}
                onChange={(e) => setDataVenc(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pago}
              onChange={(e) => setPago(e.target.checked)}
            />
            <span>Paga</span>
          </label>

          {pago && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Data de pagamento <span className="text-red-600">*</span>
                </Label>
                <Input
                  type="date"
                  value={dataPag}
                  onChange={(e) => setDataPag(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor pago (R$)</Label>
                <Input
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value)}
                  placeholder={valor}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Observacoes</Label>
            <Input
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          {nota && (
            <Button
              variant="outline"
              onClick={excluir}
              disabled={pending}
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Excluir
            </Button>
          )}
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
