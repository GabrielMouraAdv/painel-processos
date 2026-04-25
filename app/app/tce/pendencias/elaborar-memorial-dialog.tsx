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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Advogado = { id: string; nome: string };

function isoTodayPlus(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ElaborarMemorialDialog({
  open,
  onOpenChange,
  processoId,
  advogados,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  processoId: string;
  advogados: Advogado[];
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [advogadoId, setAdvogadoId] = React.useState("");
  const [dataVencimento, setDataVencimento] = React.useState(isoTodayPlus(7));
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setAdvogadoId("");
    setDataVencimento(isoTodayPlus(7));
    setErro(null);
  }, [open]);

  async function salvar() {
    setErro(null);
    if (!advogadoId) {
      setErro("Selecione o advogado responsavel.");
      return;
    }
    if (!dataVencimento) {
      setErro("Informe a data de vencimento.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tce/pendencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "memorial_prazo",
          processoId,
          advogadoRespId: advogadoId,
          dataVencimento,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error ?? "Erro ao criar prazo.");
        return;
      }
      toast({ title: "Prazo de Memorial criado" });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elaborar Memorial</DialogTitle>
          <DialogDescription>
            Crie um prazo TCE do tipo &quot;Memorial&quot; para acompanhar a
            elaboracao. O prazo aparecera na aba Prazos TCE.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Advogado responsavel</Label>
            <Select value={advogadoId} onValueChange={setAdvogadoId}>
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
          <div className="space-y-1.5">
            <Label>Data de vencimento</Label>
            <Input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
            />
          </div>
          {erro && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={submitting}
            className="bg-brand-navy hover:bg-brand-navy/90"
          >
            {submitting ? "Salvando..." : "Criar prazo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
