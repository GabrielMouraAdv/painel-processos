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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { NovoMunicipioSubDialog } from "./novo-municipio-sub-dialog";

export type MunicipioOption = { id: string; nome: string; uf: string };

export type InteressadoFormInitial = {
  id?: string;
  nome: string;
  cpf: string;
  cargo: string;
  municipio: string;
  email: string;
  telefone: string;
  observacoes: string;
};

const CARGOS_PADRAO = [
  "Prefeito",
  "Vice-Prefeito",
  "Ex-Prefeito",
  "Secretario Municipal",
  "Ex-Secretario",
  "Presidente de Autarquia",
  "Diretor",
  "Ordenador de Despesas",
] as const;

const CARGO_OUTRO = "__outro__";

function maskCpf(v: string): string {
  const d = v.replace(/\D+/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskTelefone(v: string): string {
  const d = v.replace(/\D+/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function InteressadoDialog({
  open,
  onOpenChange,
  initial,
  municipios,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: InteressadoFormInitial | null; // null = criar; objeto = editar
  municipios: MunicipioOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();

  const isEdit = !!initial?.id;

  const [nome, setNome] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [cargoSelect, setCargoSelect] = React.useState("");
  const [cargoLivre, setCargoLivre] = React.useState("");
  const [municipio, setMunicipio] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [subOpen, setSubOpen] = React.useState(false);

  // Reset state quando abrir
  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setNome(initial.nome);
      setCpf(initial.cpf);
      const padrao = (CARGOS_PADRAO as readonly string[]).includes(initial.cargo);
      setCargoSelect(padrao ? initial.cargo : CARGO_OUTRO);
      setCargoLivre(padrao ? "" : initial.cargo);
      setMunicipio(initial.municipio);
      setEmail(initial.email);
      setTelefone(initial.telefone);
      setObservacoes(initial.observacoes);
    } else {
      setNome("");
      setCpf("");
      setCargoSelect("");
      setCargoLivre("");
      setMunicipio("");
      setEmail("");
      setTelefone("");
      setObservacoes("");
    }
    setErro(null);
  }, [open, initial]);

  function municipioOnChange(v: string) {
    if (v === "__novo__") {
      setSubOpen(true);
      return;
    }
    setMunicipio(v);
  }

  function onMunicipioCriado(novo: MunicipioOption) {
    setSubOpen(false);
    setMunicipio(novo.nome);
    router.refresh();
  }

  async function salvar() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe o nome.");
      return;
    }
    if (!cargoSelect) {
      setErro("Selecione o cargo.");
      return;
    }
    if (cargoSelect === CARGO_OUTRO && !cargoLivre.trim()) {
      setErro("Informe o cargo.");
      return;
    }
    if (!municipio) {
      setErro("Selecione o municipio.");
      return;
    }

    const cargoFinal =
      cargoSelect === CARGO_OUTRO ? cargoLivre.trim() : cargoSelect;

    const payload = {
      nome: nome.trim(),
      cpf: cpf.trim() || null,
      municipio,
      cargo: cargoFinal,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      observacoes: observacoes.trim() || null,
    };

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/gestores/${initial?.id}`
        : "/api/gestores";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json.error ?? "Erro ao salvar";
        setErro(msg);
        return;
      }
      toast({
        title: isEdit ? "Interessado atualizado" : "Interessado cadastrado",
      });
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar interessado" : "Novo interessado"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Atualize os dados do interessado."
                : "Cadastre um gestor para vincular a processos do TCE."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>
                Nome completo <span className="text-red-600">*</span>
              </Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do interessado"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>CPF (opcional)</Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(maskCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Cargo atual <span className="text-red-600">*</span>
                </Label>
                <Select value={cargoSelect} onValueChange={setCargoSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARGOS_PADRAO.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    <SelectItem value={CARGO_OUTRO}>Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {cargoSelect === CARGO_OUTRO && (
              <div className="space-y-1.5">
                <Label>
                  Especifique o cargo <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={cargoLivre}
                  onChange={(e) => setCargoLivre(e.target.value)}
                  placeholder="Descreva o cargo"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>
                Municipio de atuacao atual{" "}
                <span className="text-red-600">*</span>
              </Label>
              <Select value={municipio} onValueChange={municipioOnChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o municipio" />
                </SelectTrigger>
                <SelectContent>
                  {municipios.map((m) => (
                    <SelectItem key={m.id} value={m.nome}>
                      {m.nome}/{m.uf}
                    </SelectItem>
                  ))}
                  <SelectItem value="__novo__">
                    + Cadastrar novo municipio
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Email (opcional)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@dominio.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone (opcional)</Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(maskTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observacoes (opcional)</Label>
              <Textarea
                rows={3}
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
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NovoMunicipioSubDialog
        open={subOpen}
        onOpenChange={setSubOpen}
        onCreated={onMunicipioCriado}
      />
    </>
  );
}

export function NovoInteressadoButton({
  municipios,
}: {
  municipios: MunicipioOption[];
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-brand-navy hover:bg-brand-navy/90"
      >
        <Plus className="mr-2 h-4 w-4" />
        Novo Interessado
      </Button>
      <InteressadoDialog
        open={open}
        onOpenChange={setOpen}
        initial={null}
        municipios={municipios}
      />
    </>
  );
}
