"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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

export type MunicipioFormInitial = {
  id?: string;
  nome: string;
  uf: string;
  cnpjPrefeitura: string;
  observacoes: string;
};

export function MunicipioDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: MunicipioFormInitial | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!initial?.id;

  const [nome, setNome] = React.useState("");
  const [uf, setUf] = React.useState("PE");
  const [cnpjPrefeitura, setCnpjPrefeitura] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setNome(initial.nome);
      setUf(initial.uf);
      setCnpjPrefeitura(initial.cnpjPrefeitura);
      setObservacoes(initial.observacoes);
    } else {
      setNome("");
      setUf("PE");
      setCnpjPrefeitura("");
      setObservacoes("");
    }
    setErro(null);
  }, [open, initial]);

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
      const url = isEdit
        ? `/api/tce/municipios/${initial?.id}`
        : "/api/tce/municipios";
      const method = isEdit ? "PATCH" : "POST";
      const payload = {
        nome: nome.trim(),
        uf: uf.trim().toUpperCase(),
        cnpjPrefeitura: cnpjPrefeitura.trim() || null,
        observacoes: observacoes.trim() || null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error ?? "Erro ao salvar.");
        return;
      }
      toast({
        title: isEdit ? "Municipio atualizado" : "Municipio cadastrado",
      });
      onOpenChange(false);
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
            {isEdit ? "Editar municipio" : "Novo municipio"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do municipio."
              : "Cadastre um municipio para vincular a processos do TCE."}
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
            {submitting ? "Salvando..." : isEdit ? "Salvar" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NovoMunicipioButton({
  label = "Novo Municipio",
}: {
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-brand-navy hover:bg-brand-navy/90"
      >
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <MunicipioDialog
        open={open}
        onOpenChange={setOpen}
        initial={null}
      />
    </>
  );
}
