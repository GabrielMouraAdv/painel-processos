"use client";

import * as React from "react";
import { TipoHonorario } from "@prisma/client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BANCAS, bancaBadgeClasses } from "@/lib/bancas";
import { TIPO_HONORARIO_LABELS } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

export type HonorarioParaEditar = {
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

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: HonorarioParaEditar | null;
  onSuccess: () => void;
};

function isoDate(s: string | null): string {
  if (!s) return "";
  return s.slice(0, 10);
}

export function HonorarioPessoalDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [clienteNome, setClienteNome] = React.useState("");
  const [clienteCpf, setClienteCpf] = React.useState("");
  const [bancas, setBancas] = React.useState<Set<string>>(new Set());
  const [tipo, setTipo] = React.useState<TipoHonorario>(TipoHonorario.POR_CAUSA);
  const [descricao, setDescricao] = React.useState("");
  const [valor, setValor] = React.useState("");
  const [dataContrato, setDataContrato] = React.useState("");
  const [dataVencimento, setDataVencimento] = React.useState("");
  const [pago, setPago] = React.useState(false);
  const [dataPag, setDataPag] = React.useState("");
  const [valorPago, setValorPago] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setClienteNome(editing.clienteNome);
        setClienteCpf(editing.clienteCpf ?? "");
        setBancas(new Set(editing.bancasSlug));
        setTipo(editing.tipoHonorario);
        setDescricao(editing.descricaoCausa);
        setValor(String(editing.valorTotal));
        setDataContrato(isoDate(editing.dataContrato));
        setDataVencimento(isoDate(editing.dataVencimento));
        setPago(editing.pago);
        setDataPag(isoDate(editing.dataPagamento));
        setValorPago(
          editing.valorPago !== null ? String(editing.valorPago) : "",
        );
        setObservacoes(editing.observacoes ?? "");
      } else {
        setClienteNome("");
        setClienteCpf("");
        setBancas(new Set());
        setTipo(TipoHonorario.POR_CAUSA);
        setDescricao("");
        setValor("");
        setDataContrato("");
        setDataVencimento("");
        setPago(false);
        setDataPag("");
        setValorPago("");
        setObservacoes("");
      }
    }
  }, [open, editing]);

  function toggleBanca(slug: string) {
    setBancas((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function salvar() {
    if (!clienteNome.trim()) {
      toast({ variant: "destructive", title: "Nome do cliente obrigatorio" });
      return;
    }
    if (bancas.size === 0) {
      toast({
        variant: "destructive",
        title: "Selecione pelo menos uma banca",
      });
      return;
    }
    if (!descricao.trim()) {
      toast({ variant: "destructive", title: "Descreva a causa" });
      return;
    }
    const valorNum = Number(String(valor).replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      toast({ variant: "destructive", title: "Valor invalido" });
      return;
    }
    if (!dataContrato) {
      toast({ variant: "destructive", title: "Data do contrato obrigatoria" });
      return;
    }
    if (pago && !dataPag) {
      toast({
        variant: "destructive",
        title: "Data de pagamento obrigatoria quando pago",
      });
      return;
    }

    const valorPagoNum = valorPago
      ? Number(String(valorPago).replace(/\./g, "").replace(",", "."))
      : null;

    const body: Record<string, unknown> = {
      clienteNome: clienteNome.trim(),
      clienteCpf: clienteCpf.trim() || null,
      bancasSlug: Array.from(bancas),
      tipoHonorario: tipo,
      descricaoCausa: descricao.trim(),
      valorTotal: valorNum,
      dataContrato,
      dataVencimento: dataVencimento || null,
      pago,
      dataPagamento: pago ? dataPag : null,
      valorPago: pago ? valorPagoNum : null,
      observacoes: observacoes.trim() || null,
    };

    setPending(true);
    try {
      const url = editing
        ? `/api/financeiro/honorarios-pessoais/${editing.id}`
        : "/api/financeiro/honorarios-pessoais";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: editing ? "Erro ao atualizar" : "Erro ao cadastrar",
          description: json.error,
        });
        return;
      }
      toast({ title: editing ? "Honorario atualizado" : "Honorario cadastrado" });
      onSuccess();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar honorario pessoal" : "Cadastrar honorario pessoal"}
          </DialogTitle>
          <DialogDescription>
            Honorario contratado por cliente pessoa fisica.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Cliente <span className="text-red-600">*</span>
              </Label>
              <Input
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CPF (opcional)</Label>
              <Input
                value={clienteCpf}
                onChange={(e) => setClienteCpf(e.target.value)}
              />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Tipo de honorario <span className="text-red-600">*</span>
              </Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as TipoHonorario)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_HONORARIO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Valor total (R$) <span className="text-red-600">*</span>
              </Label>
              <Input value={valor} onChange={(e) => setValor(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Descricao da causa <span className="text-red-600">*</span>
            </Label>
            <Textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Data do contrato <span className="text-red-600">*</span>
              </Label>
              <Input
                type="date"
                value={dataContrato}
                onChange={(e) => setDataContrato(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de vencimento (opcional)</Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pago}
              onChange={(e) => setPago(e.target.checked)}
            />
            <span>Pago</span>
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
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
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
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
