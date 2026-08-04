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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIAS_DOCUMENTO_ELEITORAL } from "@/lib/eleitoral-labels";

type Props = {
  processoId: string;
};

export function UploadDocumentoDialog({ processoId }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [nome, setNome] = React.useState("");
  const [categoria, setCategoria] = React.useState("OUTRO");
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
      form.set("processoId", processoId);
      form.set("nome", nome);
      form.set("categoria", categoria);
      form.set("observacoes", observacoes);
      const res = await fetch("/api/eleitoral/documentos", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error ?? "Falha no upload da peca");
      }
      toast({ title: "Peca enviada" });
      setOpen(false);
      setNome("");
      setObservacoes("");
      setCategoria("OUTRO");
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
        <Button size="sm" variant="outline">
          <Upload className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Enviar peca
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar peca</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="arquivoPeca">Arquivo</Label>
            <Input
              id="arquivoPeca"
              type="file"
              ref={fileRef}
              accept=".pdf,.doc,.docx,.odt,.txt,.md,.jpg,.jpeg,.png,.mp4,.mp3,.zip"
              required
            />
            <p className="text-xs text-muted-foreground">
              Ate 20MB. PDF, Word, texto, imagem, video, audio ou ZIP.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nomePeca">Nome / descricao</Label>
              <Input
                id="nomePeca"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Defesa protocolada"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DOCUMENTO_ELEITORAL.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obsPeca">Observacoes</Label>
            <Textarea
              id="obsPeca"
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
