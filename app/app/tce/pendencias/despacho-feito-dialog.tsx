"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2 } from "lucide-react";

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

function isoToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function DespachoFeitoDialog({
  open,
  onOpenChange,
  processoId,
  pendenciasApiPath,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  processoId: string;
  pendenciasApiPath: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [dataEfetiva, setDataEfetiva] = React.useState(isoToday());
  const [retorno, setRetorno] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setDataEfetiva(isoToday());
    setRetorno("");
    setErro(null);
  }, [open]);

  async function salvar() {
    setErro(null);
    setSubmitting(true);
    try {
      const res = await fetch(pendenciasApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "despacho_feito",
          processoId,
          retorno: retorno.trim() || null,
          dataEfetiva,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error ?? "Falha ao registrar despacho");
        return;
      }
      toast({ title: "Despacho registrado" });
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
          <DialogTitle>Marcar como Despachado</DialogTitle>
          <DialogDescription>
            Registre quando o despacho foi realizado e o retorno do relator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Data efetiva do despacho</Label>
            <Input
              type="date"
              value={dataEfetiva}
              onChange={(e) => setDataEfetiva(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Retorno do despacho (opcional)</Label>
            <Textarea
              rows={4}
              value={retorno}
              onChange={(e) => setRetorno(e.target.value)}
              placeholder="O que o relator decidiu ou comentou..."
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
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ClipboardCheck className="mr-2 h-4 w-4" />
            )}
            Marcar Despachado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
