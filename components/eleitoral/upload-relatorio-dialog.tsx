"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { hojeBrasilYmd } from "@/lib/eleitoral-labels";

export function UploadRelatorioDialog() {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [titulo, setTitulo] = React.useState("");
  const [dataReferencia, setDataReferencia] = React.useState(
    hojeBrasilYmd(),
  );
  const [observacoes, setObservacoes] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast({ title: "Selecione um arquivo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("titulo", titulo);
      form.set("dataReferencia", dataReferencia);
      form.set("observacoes", observacoes);
      const res = await fetch("/api/eleitoral/relatorios", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? "Falha no upload do relatorio");
      }
      toast({ title: "Relatorio enviado" });
      setOpen(false);
      setTitulo("");
      setObservacoes("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
          Enviar relatorio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar relatorio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Titulo</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Monitoramento PDPJ — 03/08 (manha)"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dataRef">Data de referencia</Label>
              <Input
                id="dataRef"
                type="date"
                value={dataReferencia}
                onChange={(e) => setDataReferencia(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="arquivo">Arquivo (PDF, MD, DOCX...)</Label>
              <Input
                id="arquivo"
                type="file"
                ref={fileRef}
                accept=".pdf,.md,.docx,.doc,.txt,.html"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obsRel">Observacoes</Label>
            <Textarea
              id="obsRel"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
