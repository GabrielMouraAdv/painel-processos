"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Advogado = { id: string; nome: string };
type Modo = "memorial" | "despacho" | "prazo";

export function DispensarPendenciaDialog({
  open,
  onOpenChange,
  modo,
  processoId,
  prazoId,
  prazoTipo,
  advogados,
  apiPath,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modo: Modo;
  processoId?: string;
  prazoId?: string;
  prazoTipo?: string;
  advogados: Advogado[];
  apiPath: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [advogadoId, setAdvogadoId] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setAdvogadoId("");
    setMotivo("");
    setErro(null);
  }, [open]);

  async function confirmar() {
    setErro(null);
    if (!advogadoId) {
      setErro("Selecione o advogado que esta dispensando.");
      return;
    }
    setSubmitting(true);
    try {
      const acao =
        modo === "memorial"
          ? "dispensar_memorial"
          : modo === "despacho"
            ? "dispensar_despacho"
            : "dispensar_prazo";
      const body =
        modo === "prazo"
          ? { acao, prazoId, advogadoId, motivo: motivo.trim() || null }
          : { acao, processoId, advogadoId, motivo: motivo.trim() || null };
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error ?? "Falha ao dispensar");
        return;
      }
      toast({
        title:
          modo === "memorial"
            ? "Memorial dispensado"
            : modo === "despacho"
              ? "Despacho dispensado"
              : "Prazo dispensado",
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
              ? "Dispensar Memorial"
              : modo === "despacho"
                ? "Dispensar Despacho"
                : `Dispensar Prazo${prazoTipo ? `: ${prazoTipo}` : ""}`}
          </DialogTitle>
          <DialogDescription>
            {modo === "memorial"
              ? "Marque o memorial como dispensado neste processo. A pendencia sai da lista."
              : modo === "despacho"
                ? "Marque o despacho como dispensado neste processo. A pendencia sai da lista."
                : "Marque o prazo como dispensado. O alerta sai da lista de pendencias e o prazo nao conta nos KPIs."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>
              Advogado que dispensou <span className="text-red-600">*</span>
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
          <div className="space-y-1.5">
            <Label>Motivo da dispensa (opcional)</Label>
            <Textarea
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: tese ja consolidada em julgamento anterior..."
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
            onClick={confirmar}
            disabled={submitting}
            className="bg-slate-700 hover:bg-slate-800"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Ban className="mr-2 h-4 w-4" />
            )}
            Confirmar Dispensa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
