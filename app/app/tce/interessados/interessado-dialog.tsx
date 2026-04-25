"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Building2, User } from "lucide-react";

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
import { cn } from "@/lib/utils";

import { NovoMunicipioSubDialog } from "./novo-municipio-sub-dialog";

export type MunicipioOption = { id: string; nome: string; uf: string };

export type InteressadoFormInitial = {
  id?: string;
  tipoInteressado: "PESSOA_FISICA" | "PESSOA_JURIDICA";
  // PF
  nome: string;
  cpf: string;
  cargo: string;
  municipio: string;
  // PJ
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  ramoAtividade: string;
  municipioIds: string[];
  // Comum
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

function maskCnpj(v: string): string {
  const d = v.replace(/\D+/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
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

function MunicipioMultiSelect({
  municipios,
  selecionadosIds,
  onChange,
  onCadastrarNovo,
}: {
  municipios: MunicipioOption[];
  selecionadosIds: string[];
  onChange: (ids: string[]) => void;
  onCadastrarNovo: () => void;
}) {
  const selecionados = React.useMemo(
    () =>
      selecionadosIds
        .map((id) => municipios.find((m) => m.id === id))
        .filter((m): m is MunicipioOption => !!m),
    [selecionadosIds, municipios],
  );
  const disponiveis = React.useMemo(
    () => municipios.filter((m) => !selecionadosIds.includes(m.id)),
    [municipios, selecionadosIds],
  );

  function adicionar(id: string) {
    if (id === "__novo__") {
      onCadastrarNovo();
      return;
    }
    if (!selecionadosIds.includes(id)) {
      onChange([...selecionadosIds, id]);
    }
  }
  function remover(id: string) {
    onChange(selecionadosIds.filter((x) => x !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value="" onValueChange={adicionar}>
        <SelectTrigger>
          <SelectValue placeholder="Adicionar municipio" />
        </SelectTrigger>
        <SelectContent>
          {disponiveis.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.nome}/{m.uf}
            </SelectItem>
          ))}
          <SelectItem value="__novo__">+ Cadastrar novo municipio</SelectItem>
        </SelectContent>
      </Select>
      {selecionados.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {selecionados.map((m) => (
            <li key={m.id}>
              <span className="inline-flex items-center gap-1 rounded-md border border-brand-navy/30 bg-brand-navy/10 px-2 py-1 text-xs font-medium text-brand-navy">
                {m.nome}/{m.uf}
                <button
                  type="button"
                  onClick={() => remover(m.id)}
                  aria-label={`Remover ${m.nome}`}
                  className="text-brand-navy/70 transition-colors hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nenhum municipio selecionado.
        </p>
      )}
    </div>
  );
}

export function InteressadoDialog({
  open,
  onOpenChange,
  initial,
  municipios,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: InteressadoFormInitial | null;
  municipios: MunicipioOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!initial?.id;

  const [tipo, setTipo] = React.useState<"PESSOA_FISICA" | "PESSOA_JURIDICA">(
    "PESSOA_FISICA",
  );
  // PF
  const [nome, setNome] = React.useState("");
  const [cpf, setCpf] = React.useState("");
  const [cargoSelect, setCargoSelect] = React.useState("");
  const [cargoLivre, setCargoLivre] = React.useState("");
  const [municipioPf, setMunicipioPf] = React.useState("");
  // PJ
  const [razaoSocial, setRazaoSocial] = React.useState("");
  const [nomeFantasia, setNomeFantasia] = React.useState("");
  const [cnpj, setCnpj] = React.useState("");
  const [ramoAtividade, setRamoAtividade] = React.useState("");
  const [municipioIds, setMunicipioIds] = React.useState<string[]>([]);
  // Comum
  const [email, setEmail] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [subOpen, setSubOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setTipo(initial.tipoInteressado);
      setNome(initial.nome);
      setCpf(initial.cpf);
      const cargoPadrao = (CARGOS_PADRAO as readonly string[]).includes(
        initial.cargo,
      );
      setCargoSelect(
        initial.cargo
          ? cargoPadrao
            ? initial.cargo
            : CARGO_OUTRO
          : "",
      );
      setCargoLivre(cargoPadrao ? "" : initial.cargo);
      setMunicipioPf(initial.municipio);
      setRazaoSocial(initial.razaoSocial);
      setNomeFantasia(initial.nomeFantasia);
      setCnpj(initial.cnpj);
      setRamoAtividade(initial.ramoAtividade);
      setMunicipioIds(initial.municipioIds);
      setEmail(initial.email);
      setTelefone(initial.telefone);
      setObservacoes(initial.observacoes);
    } else {
      setTipo("PESSOA_FISICA");
      setNome("");
      setCpf("");
      setCargoSelect("");
      setCargoLivre("");
      setMunicipioPf("");
      setRazaoSocial("");
      setNomeFantasia("");
      setCnpj("");
      setRamoAtividade("");
      setMunicipioIds([]);
      setEmail("");
      setTelefone("");
      setObservacoes("");
    }
    setErro(null);
  }, [open, initial]);

  function municipioPfChange(v: string) {
    if (v === "__novo__") {
      setSubOpen(true);
      return;
    }
    setMunicipioPf(v);
  }

  function onMunicipioCriado(novo: MunicipioOption) {
    setSubOpen(false);
    if (tipo === "PESSOA_FISICA") {
      setMunicipioPf(novo.nome);
    } else {
      setMunicipioIds((prev) =>
        prev.includes(novo.id) ? prev : [...prev, novo.id],
      );
    }
    router.refresh();
  }

  async function salvar() {
    setErro(null);

    let payload: Record<string, unknown>;
    if (tipo === "PESSOA_FISICA") {
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
      if (!municipioPf) {
        setErro("Selecione o municipio.");
        return;
      }
      const cargoFinal =
        cargoSelect === CARGO_OUTRO ? cargoLivre.trim() : cargoSelect;
      payload = {
        tipoInteressado: "PESSOA_FISICA",
        nome: nome.trim(),
        cpf: cpf.trim() || null,
        cargo: cargoFinal,
        municipio: municipioPf,
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        observacoes: observacoes.trim() || null,
      };
    } else {
      if (!razaoSocial.trim()) {
        setErro("Informe a razao social.");
        return;
      }
      payload = {
        tipoInteressado: "PESSOA_JURIDICA",
        razaoSocial: razaoSocial.trim(),
        nomeFantasia: nomeFantasia.trim() || null,
        cnpj: cnpj.trim() || null,
        ramoAtividade: ramoAtividade.trim() || null,
        municipioIds,
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        observacoes: observacoes.trim() || null,
      };
    }

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/gestores/${initial?.id}` : "/api/gestores";
      const method = isEdit ? "PATCH" : "POST";
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
                : "Cadastre um interessado para vincular a processos do TCE."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Tipo de interessado
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTipo("PESSOA_FISICA")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    tipo === "PESSOA_FISICA"
                      ? "border-brand-navy bg-brand-navy text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <User className="h-4 w-4" />
                  Pessoa Fisica
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("PESSOA_JURIDICA")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    tipo === "PESSOA_JURIDICA"
                      ? "border-brand-navy bg-brand-navy text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Pessoa Juridica
                </button>
              </div>
            </div>

            {tipo === "PESSOA_FISICA" ? (
              <>
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
                    <Select
                      value={cargoSelect}
                      onValueChange={setCargoSelect}
                    >
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
                      Especifique o cargo{" "}
                      <span className="text-red-600">*</span>
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
                  <Select
                    value={municipioPf}
                    onValueChange={municipioPfChange}
                  >
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
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>
                    Razao Social <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value)}
                    placeholder="Razao social da empresa"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome Fantasia (opcional)</Label>
                  <Input
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Nome fantasia"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>CNPJ (opcional)</Label>
                    <Input
                      value={cnpj}
                      onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                      placeholder="00.000.000/0000-00"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ramo de atividade (opcional)</Label>
                    <Input
                      value={ramoAtividade}
                      onChange={(e) => setRamoAtividade(e.target.value)}
                      placeholder="Ex: construcao civil"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Municipios de atuacao</Label>
                  <MunicipioMultiSelect
                    municipios={municipios}
                    selecionadosIds={municipioIds}
                    onChange={setMunicipioIds}
                    onCadastrarNovo={() => setSubOpen(true)}
                  />
                </div>
              </>
            )}

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
