"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

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

function isoToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function MemorialProntoDialog({
  open,
  onOpenChange,
  processoId,
  escopo,
  pendenciasApiPath,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  processoId: string;
  escopo: "tce" | "judicial";
  pendenciasApiPath: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [dataConclusao, setDataConclusao] = React.useState(isoToday());
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setFile(null);
    setDataConclusao(isoToday());
    setErro(null);
  }, [open]);

  async function salvar() {
    setErro(null);
    if (!file) {
      setErro("Anexe o arquivo do memorial.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErro("Arquivo maior que 10MB.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload do arquivo
      const fd = new FormData();
      fd.append("file", file);
      fd.append("escopo", escopo);
      fd.append("processoId", processoId);
      fd.append("tipo", "memorial");
      fd.append("nome", file.name);
      const upRes = await fetch("/api/documentos/upload", {
        method: "POST",
        body: fd,
      });
      if (!upRes.ok) {
        const json = await upRes.json().catch(() => ({}));
        setErro(json.error ?? "Falha no upload do memorial");
        return;
      }
      // 2. Marca memorial pronto (cria andamento server-side)
      const acaoRes = await fetch(pendenciasApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "memorial_pronto",
          processoId,
          dataConclusao,
        }),
      });
      if (!acaoRes.ok) {
        const json = await acaoRes.json().catch(() => ({}));
        setErro(json.error ?? "Falha ao marcar memorial pronto");
        return;
      }
      toast({ title: "Memorial registrado" });
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
          <DialogTitle>Memorial Pronto</DialogTitle>
          <DialogDescription>
            Anexe o arquivo do memorial elaborado para concluir esta
            pendencia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>
              Arquivo do memorial (PDF/DOCX, max 10MB){" "}
              <span className="text-red-600">*</span>
            </Label>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {file ? file.name : "Selecionar arquivo..."}
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>Data de conclusao</Label>
            <Input
              type="date"
              value={dataConclusao}
              onChange={(e) => setDataConclusao(e.target.value)}
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
            disabled={submitting || !file}
            className="bg-brand-navy hover:bg-brand-navy/90"
          >
            {submitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
