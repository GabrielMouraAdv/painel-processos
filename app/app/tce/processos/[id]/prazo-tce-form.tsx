"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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

function addDiasUteis(from: string, diasUteis: number): string {
  const d = new Date(from);
  let restantes = diasUteis;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) restantes--;
  }
  return d.toISOString().slice(0, 10);
}

type AdvogadoOption = { id: string; nome: string };

type Props = {
  processoId: string;
  advogados: AdvogadoOption[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function PrazoTceFormDialog({
  processoId,
  advogados,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [tipo, setTipo] = React.useState("");
  const [dataIntimacao, setDataIntimacao] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [diasUteis, setDiasUteis] = React.useState("30");
  const [dataVencimento, setDataVencimento] = React.useState("");
  const [prorrogavel, setProrrogavel] = React.useState(true);
  const [advogadoRespId, setAdvogadoRespId] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (dataIntimacao && diasUteis) {
      const dias = Number(diasUteis);
      if (Number.isFinite(dias) && dias > 0) {
        setDataVencimento(addDiasUteis(dataIntimacao, dias));
      }
    }
  }, [dataIntimacao, diasUteis]);

  React.useEffect(() => {
    if (!open) {
      setTipo("");
      setObservacoes("");
      setDiasUteis("30");
      setProrrogavel(true);
      setAdvogadoRespId("");
      setDataIntimacao(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo.trim() || !dataIntimacao || !dataVencimento || !diasUteis) {
      toast({
        variant: "destructive",
        title: "Preencha os campos",
      });
      return;
    }
    if (!advogadoRespId) {
      toast({
        variant: "destructive",
        title: "Selecione o advogado responsavel",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tce/prazos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processoId,
          tipo: tipo.trim(),
          dataIntimacao,
          dataVencimento,
          diasUteis: Number(diasUteis),
          prorrogavel,
          advogadoRespId,
          observacoes: observacoes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao criar prazo",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Prazo cadastrado" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo prazo TCE</DialogTitle>
          <DialogDescription>
            Informe a intimacao e o prazo em dias uteis.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo do prazo</Label>
            <Input
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Ex.: Defesa Previa, Embargos de Declaracao..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Intimacao</Label>
              <Input
                type="date"
                value={dataIntimacao}
                onChange={(e) => setDataIntimacao(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dias uteis</Label>
              <Input
                type="number"
                min={1}
                value={diasUteis}
                onChange={(e) => setDiasUteis(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              Advogado responsavel <span className="text-red-600">*</span>
            </Label>
            <Select value={advogadoRespId} onValueChange={setAdvogadoRespId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o advogado" />
              </SelectTrigger>
              <SelectContent>
                {advogados.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prorrogavel}
              onChange={(e) => setProrrogavel(e.target.checked)}
            />
            Prorrogavel
          </label>
          <div className="space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              {submitting ? "Salvando..." : "Cadastrar prazo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
