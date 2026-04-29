"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CamaraTce, TipoRecursoTce } from "@prisma/client";

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
import { BANCAS, bancaBadgeClasses } from "@/lib/bancas";
import {
  TCE_CAMARA_LABELS,
  TCE_RECURSO_CODE,
  TCE_RECURSO_LABELS,
  PRAZOS_RECURSOS_TCE,
} from "@/lib/tce-config";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  processoOrigemId: string;
  baseNumero: string;
  bancasOrigem: string[];
  proximaSequencial: (tipo: TipoRecursoTce) => number;
};

function isoToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

export function InterporRecursoDialog({
  open,
  onOpenChange,
  processoOrigemId,
  baseNumero,
  bancasOrigem,
  proximaSequencial,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [tipo, setTipo] = React.useState<TipoRecursoTce>("RECURSO_ORDINARIO");
  const [numero, setNumero] = React.useState("");
  const [dataInterposicao, setDataInterposicao] = React.useState(isoToday());
  const [dataIntimacao, setDataIntimacao] = React.useState("");
  const [relator, setRelator] = React.useState("");
  const [camara, setCamara] = React.useState<CamaraTce>("PRIMEIRA");
  const [exercicio, setExercicio] = React.useState("");
  const [faseAtual, setFaseAtual] = React.useState("recurso_interposto");
  const [bancas, setBancas] = React.useState<Set<string>>(
    () => new Set(bancasOrigem),
  );
  const [observacoes, setObservacoes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const seq = proximaSequencial(tipo);
  const numeroSugerido = `${baseNumero}${TCE_RECURSO_CODE[tipo]}${pad3(seq)}`;

  React.useEffect(() => {
    if (!open) return;
    setTipo("RECURSO_ORDINARIO");
    setNumero("");
    setDataInterposicao(isoToday());
    setDataIntimacao("");
    setRelator("");
    setCamara("PRIMEIRA");
    setExercicio("");
    setFaseAtual("recurso_interposto");
    setBancas(new Set(bancasOrigem));
    setObservacoes("");
    setErro(null);
  }, [open, bancasOrigem]);

  React.useEffect(() => {
    // Re-sugere numero quando tipo muda e usuario nao digitou um custom
    if (!numero || numero.startsWith(baseNumero)) {
      setNumero(numeroSugerido);
    }
  }, [tipo, numeroSugerido, baseNumero, numero]);

  const prazoCfg = PRAZOS_RECURSOS_TCE[tipo];

  function toggleBanca(slug: string) {
    setBancas((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function salvar() {
    setErro(null);
    setSubmitting(true);
    try {
      if (bancas.size === 0) {
        setErro("Selecione pelo menos uma banca");
        return;
      }
      const numeroFinal = (numero || numeroSugerido).trim();
      const res = await fetch("/api/tce/processos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: numeroFinal,
          tipo: "AUDITORIA_ESPECIAL", // o tipo do processo (sera mantido)
          municipioId: null,
          relator: relator.trim() || null,
          camara,
          faseAtual,
          conselheiroSubstituto: null,
          notaTecnica: false,
          parecerMpco: false,
          despachadoComRelator: false,
          memorialPronto: false,
          exercicio: exercicio.trim() || null,
          valorAutuado: null,
          objeto: observacoes.trim() || `Recurso ${TCE_RECURSO_LABELS[tipo]} interposto contra ${baseNumero}.`,
          dataAutuacao: dataInterposicao || null,
          dataIntimacao: dataIntimacao || null,
          bancasSlug: Array.from(bancas),
          interessados: [],
          ehRecurso: true,
          tipoRecurso: tipo,
          processoOrigemId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error ?? "Erro ao cadastrar recurso");
        return;
      }
      toast({ title: `Recurso ${numeroFinal} cadastrado` });
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastrar recurso</DialogTitle>
          <DialogDescription>
            Cria um novo processo TCE autonomo, vinculado a {baseNumero} como
            origem do recurso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de recurso</Label>
              <Select
                value={tipo}
                onValueChange={(v) => setTipo(v as TipoRecursoTce)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(TipoRecursoTce).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TCE_RECURSO_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Numero do recurso</Label>
              <Input
                value={numero || numeroSugerido}
                onChange={(e) => setNumero(e.target.value)}
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Sugestao: <code>{numeroSugerido}</code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data de interposicao</Label>
              <Input
                type="date"
                value={dataInterposicao}
                onChange={(e) => setDataInterposicao(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de intimacao (opcional)</Label>
              <Input
                type="date"
                value={dataIntimacao}
                onChange={(e) => setDataIntimacao(e.target.value)}
              />
            </div>
          </div>

          {prazoCfg && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <strong>{prazoCfg.tipo}</strong>: {prazoCfg.diasUteis} dias uteis,{" "}
              {prazoCfg.prorrogavel ? "prorrogavel" : "improrrogavel"}
              {prazoCfg.observacao ? ` — ${prazoCfg.observacao}` : ""}.
              {dataIntimacao
                ? " Prazo automatico sera criado."
                : " Informe a data de intimacao para gerar o prazo."}
            </div>
          )}

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
              <Label>Camara</Label>
              <Select
                value={camara}
                onValueChange={(v) => setCamara(v as CamaraTce)}
              >
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
              <Label>Exercicio (opcional)</Label>
              <Input
                value={exercicio}
                onChange={(e) => setExercicio(e.target.value)}
                placeholder="Ex.: 2024"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fase / Estagio</Label>
              <Input
                value={faseAtual}
                onChange={(e) => setFaseAtual(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Bancas <span className="text-red-600">*</span>
            </Label>
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
                  >
                    {b.nome}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Bancas iniciais herdadas do processo de origem — pode editar.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Observacoes / Objeto (opcional)</Label>
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
            {submitting ? "Salvando..." : "Cadastrar recurso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
