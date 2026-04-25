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
import { Textarea } from "@/components/ui/textarea";

import type { MunicipioOption } from "./interessado-dialog";

export function NovoMunicipioSubDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (m: MunicipioOption) => void;
}) {
  const [nome, setNome] = React.useState("");
  const [uf, setUf] = React.useState("PE");
  const [cnpjPrefeitura, setCnpjPrefeitura] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setNome("");
    setUf("PE");
    setCnpjPrefeitura("");
    setObservacoes("");
    setErro(null);
  }, [open]);

  async function salvar() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe o nome.");
      return;
    }
    if (uf.trim().length !== 2) {
      setErro("UF deve ter 2 letras.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tce/municipios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          uf: uf.trim().toUpperCase(),
          cnpjPrefeitura: cnpjPrefeitura.trim() || null,
          observacoes: observacoes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error ?? "Erro ao salvar");
        return;
      }
      onCreated({
        id: json.id,
        nome: json.nome,
        uf: json.uf,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo municipio</DialogTitle>
          <DialogDescription>
            Cadastre um municipio para vincular a processos do TCE.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>UF</Label>
              <Input
                maxLength={2}
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>CNPJ da Prefeitura (opcional)</Label>
            <Input
              value={cnpjPrefeitura}
              onChange={(e) => setCnpjPrefeitura(e.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
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
            {submitting ? "Salvando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
