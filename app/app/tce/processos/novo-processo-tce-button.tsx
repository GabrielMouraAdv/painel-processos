"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CamaraTce, TipoProcessoTce } from "@prisma/client";
import { Plus, Trash2, Plus as PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BANCAS, bancaBadgeClasses } from "@/lib/bancas";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  TCE_CAMARA_LABELS,
  TCE_TIPO_LABELS,
  fasesDoTipo,
} from "@/lib/tce-config";

export type MunicipioOption = { id: string; nome: string; uf: string };
export type GestorOption = {
  id: string;
  nome: string;
  cargo: string;
  tipoInteressado: "PESSOA_FISICA" | "PESSOA_JURIDICA";
  nomeFantasia?: string | null;
};

type InteressadoRow = { gestorId: string; cargo: string };

type Props = {
  municipios: MunicipioOption[];
  gestores: GestorOption[];
  defaultBancaSlug?: string | null;
};

const NEW_MUNICIPIO = "__new__";

export function NovoProcessoTceButton({
  municipios: initialMun,
  gestores,
  defaultBancaSlug,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [municipios, setMunicipios] = React.useState<MunicipioOption[]>(initialMun);

  const initialBancas = React.useMemo(
    () => (defaultBancaSlug ? new Set([defaultBancaSlug]) : new Set<string>()),
    [defaultBancaSlug],
  );

  const [numero, setNumero] = React.useState("");
  const [tipo, setTipo] = React.useState<TipoProcessoTce>("PRESTACAO_CONTAS_GOVERNO");
  const [municipioId, setMunicipioId] = React.useState("");
  const [camara, setCamara] = React.useState<CamaraTce>("PRIMEIRA");
  const [relator, setRelator] = React.useState("");
  const [conselheiroSubstituto, setConselheiroSubstituto] = React.useState("");
  const [exercicio, setExercicio] = React.useState("");
  const [valorAutuado, setValorAutuado] = React.useState("");
  const [objeto, setObjeto] = React.useState("");
  const [dataAutuacao, setDataAutuacao] = React.useState("");
  const [dataIntimacao, setDataIntimacao] = React.useState("");
  const [faseAtual, setFaseAtual] = React.useState("");
  const [notaTecnica, setNotaTecnica] = React.useState(false);
  const [parecerMpco, setParecerMpco] = React.useState(false);
  const [bancas, setBancas] = React.useState<Set<string>>(initialBancas);
  const [interessados, setInteressados] = React.useState<InteressadoRow[]>([]);

  function toggleBanca(slug: string) {
    setBancas((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const fases = React.useMemo(() => fasesDoTipo(tipo), [tipo]);

  React.useEffect(() => {
    if (!fases.find((f) => f.key === faseAtual)) {
      setFaseAtual(fases[0]?.key ?? "");
    }
  }, [fases, faseAtual]);

  function resetar() {
    setNumero("");
    setTipo("PRESTACAO_CONTAS_GOVERNO");
    setMunicipioId("");
    setCamara("PRIMEIRA");
    setRelator("");
    setConselheiroSubstituto("");
    setExercicio("");
    setValorAutuado("");
    setObjeto("");
    setDataAutuacao("");
    setDataIntimacao("");
    setFaseAtual("");
    setNotaTecnica(false);
    setParecerMpco(false);
    setBancas(initialBancas);
    setInteressados([]);
  }

  async function handleMunicipioChange(v: string) {
    if (v === NEW_MUNICIPIO) {
      const nome = window.prompt("Nome do novo municipio:");
      if (!nome) return;
      const uf =
        (window.prompt("UF (2 letras):", "PE") ?? "PE").toUpperCase().slice(0, 2);
      const res = await fetch("/api/tce/municipios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, uf }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao criar municipio",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      const novo: MunicipioOption = { id: json.id, nome, uf };
      setMunicipios((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
      setMunicipioId(json.id);
      toast({ title: "Municipio criado" });
      router.refresh();
    } else {
      setMunicipioId(v);
    }
  }

  function adicionarInteressado() {
    setInteressados((prev) => [...prev, { gestorId: "", cargo: "" }]);
  }

  function atualizarInteressado(idx: number, patch: Partial<InteressadoRow>) {
    setInteressados((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  }

  function removerInteressado(idx: number) {
    setInteressados((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const interessadosValidos = interessados.filter(
      (i) => i.gestorId && i.cargo.trim(),
    );

    const payload = {
      numero: numero.trim(),
      tipo,
      municipioId: municipioId || null,
      relator: relator.trim() || null,
      camara,
      faseAtual,
      conselheiroSubstituto: conselheiroSubstituto.trim() || null,
      notaTecnica,
      parecerMpco,
      despachadoComRelator: false,
      memorialPronto: false,
      exercicio: exercicio.trim() || null,
      valorAutuado: valorAutuado ? valorAutuado.replace(/\./g, "").replace(",", ".") : null,
      objeto: objeto.trim(),
      dataAutuacao: dataAutuacao || null,
      dataIntimacao: dataIntimacao || null,
      bancasSlug: Array.from(bancas),
      interessados: interessadosValidos,
    };

    if (!payload.numero || !payload.objeto || !payload.faseAtual) {
      toast({
        variant: "destructive",
        title: "Preencha os campos obrigatorios",
        description: "Numero, objeto e fase sao obrigatorios.",
      });
      return;
    }
    if (payload.bancasSlug.length === 0) {
      toast({
        variant: "destructive",
        title: "Selecione pelo menos uma banca",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tce/processos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao criar processo",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Processo TCE cadastrado" });
      resetar();
      setOpen(false);
      if (json.id) router.push(`/app/tce/processos/${json.id}`);
      else router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand-navy hover:bg-brand-navy/90">
          <Plus className="mr-2 h-4 w-4" />
          Novo Processo TCE
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo processo TCE</DialogTitle>
          <DialogDescription>
            Cadastre um processo do Tribunal de Contas com interessados vinculados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Numero</Label>
              <Input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ex.: TCE-PE 24.0001-5"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoProcessoTce)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TCE_TIPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Municipio</Label>
              <Select value={municipioId || ""} onValueChange={handleMunicipioChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o municipio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_MUNICIPIO}>
                    <span className="flex items-center gap-2 text-brand-navy">
                      <PlusIcon className="h-3.5 w-3.5" />
                      Criar novo municipio
                    </span>
                  </SelectItem>
                  {municipios.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome} / {m.uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Camara</Label>
              <Select value={camara} onValueChange={(v) => setCamara(v as CamaraTce)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TCE_CAMARA_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Relator</Label>
              <Input
                value={relator}
                onChange={(e) => setRelator(e.target.value)}
                placeholder="Nome do conselheiro relator"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Conselheiro Substituto (opcional)</Label>
              <Input
                value={conselheiroSubstituto}
                onChange={(e) => setConselheiroSubstituto(e.target.value)}
                placeholder="Nome do substituto"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Exercicio</Label>
              <Input
                value={exercicio}
                onChange={(e) => setExercicio(e.target.value)}
                placeholder="Ex.: 2024"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor autuado (opcional)</Label>
              <Input
                value={valorAutuado}
                onChange={(e) => setValorAutuado(e.target.value)}
                placeholder="Ex.: 1250000,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fase atual</Label>
              <Select value={faseAtual} onValueChange={setFaseAtual}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a fase" />
                </SelectTrigger>
                <SelectContent>
                  {fases.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Data de autuacao</Label>
              <Input
                type="date"
                value={dataAutuacao}
                onChange={(e) => setDataAutuacao(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de intimacao</Label>
              <Input
                type="date"
                value={dataIntimacao}
                onChange={(e) => setDataIntimacao(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Se preenchida e a fase for &quot;Defesa Previa&quot; ou
                &quot;Manifestacao Previa&quot;, um prazo e gerado automaticamente.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Objeto</Label>
            <Textarea
              rows={3}
              value={objeto}
              onChange={(e) => setObjeto(e.target.value)}
              placeholder="Descreva o objeto do processo"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={notaTecnica}
                onChange={(e) =>
                  setNotaTecnica((e.target as HTMLInputElement).checked)
                }
              />
              <span>Nota Tecnica</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={parecerMpco}
                onChange={(e) =>
                  setParecerMpco((e.target as HTMLInputElement).checked)
                }
              />
              <span>Parecer MPCO</span>
            </label>
          </div>

          <Card>
            <CardContent className="space-y-2 p-4">
              <div>
                <h3 className="text-sm font-semibold text-brand-navy">
                  Bancas <span className="text-red-600">*</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Selecione pelo menos uma banca. Compartilhados podem ter mais de uma.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BANCAS.map((b) => {
                  const ativo = bancas.has(b.slug);
                  return (
                    <button
                      key={b.slug}
                      type="button"
                      onClick={() => toggleBanca(b.slug)}
                      aria-pressed={ativo}
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 transition-colors",
                        ativo
                          ? bancaBadgeClasses(b.cor)
                          : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 hover:text-slate-700",
                      )}
                      title={
                        b.advogado
                          ? `${b.nome} — ${b.advogado}${b.oab ? ` (${b.oab})` : ""}`
                          : b.nome
                      }
                    >
                      {b.nome}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-brand-navy">
                    Interessados
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Adicione um ou mais gestores como interessados, com cargo editavel.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarInteressado}
                >
                  <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>
              {interessados.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum interessado adicionado.
                </p>
              ) : (
                <ul className="space-y-2">
                  {interessados.map((row, idx) => (
                    <li key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <Select
                        value={row.gestorId}
                        onValueChange={(v) =>
                          atualizarInteressado(idx, { gestorId: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o gestor" />
                        </SelectTrigger>
                        <SelectContent>
                          {gestores.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              [
                              {g.tipoInteressado === "PESSOA_JURIDICA"
                                ? "PJ"
                                : "PF"}
                              ] {g.nome}
                              {g.nomeFantasia ? ` (${g.nomeFantasia})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={row.cargo}
                        onChange={(e) =>
                          atualizarInteressado(idx, { cargo: e.target.value })
                        }
                        placeholder="Cargo no processo"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                        onClick={() => removerInteressado(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetar();
                setOpen(false);
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              {submitting ? "Salvando..." : "Cadastrar processo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
