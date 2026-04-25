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
import { useToast } from "@/hooks/use-toast";

type Advogado = { id: string; nome: string };

type Modo = "memorial" | "despacho";

function isoTodayPlus(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AgendarPendenciaDialog({
  open,
  onOpenChange,
  modo,
  processoId,
  advogados,
  initialData,
  initialAdvogadoId,
  apiPath = "/api/tce/pendencias",
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modo: Modo;
  processoId: string;
  advogados: Advogado[];
  initialData?: string | null;
  initialAdvogadoId?: string | null;
  apiPath?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState(initialData ?? isoTodayPlus(3));
  const [advogadoId, setAdvogadoId] = React.useState(initialAdvogadoId ?? "");
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setData(initialData ?? isoTodayPlus(3));
    setAdvogadoId(initialAdvogadoId ?? "");
    setErro(null);
  }, [open, initialData, initialAdvogadoId]);

  async function salvar() {
    setErro(null);
    if (!advogadoId) {
      setErro("Selecione o advogado responsavel.");
      return;
    }
    if (!data) {
      setErro("Informe a data.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: modo === "memorial" ? "agendar_memorial" : "agendar_despacho",
          processoId,
          data,
          advogadoId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error ?? "Erro ao agendar");
        return;
      }
      toast({
        title:
          modo === "memorial"
            ? "Memorial agendado"
            : "Despacho agendado",
      });
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modo === "memorial"
              ? "Agendar Elaboracao do Memorial"
              : "Agendar Marcacao do Despacho"}
          </DialogTitle>
          <DialogDescription>
            {modo === "memorial"
              ? "Informe quando o memorial sera elaborado e por qual advogado."
              : "Informe quando o despacho com o relator sera realizado e por qual advogado."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>
              {modo === "memorial"
                ? "Data prevista de elaboracao"
                : "Data agendada do despacho"}{" "}
              <span className="text-red-600">*</span>
            </Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Advogado responsavel <span className="text-red-600">*</span>
            </Label>
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
            {submitting ? "Salvando..." : initialData ? "Reagendar" : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
