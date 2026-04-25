"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TipoRecursoTce } from "@prisma/client";

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
import {
  TCE_RECURSO_CODE,
  TCE_RECURSO_LABELS,
  PRAZOS_RECURSOS_TCE,
} from "@/lib/tce-config";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  processoPaiId?: string;
  subprocessoPaiId?: string;
  baseNumero: string;
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
  processoPaiId,
  subprocessoPaiId,
  baseNumero,
  proximaSequencial,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [tipo, setTipo] = React.useState<TipoRecursoTce>("RECURSO_ORDINARIO");
  const [dataInterposicao, setDataInterposicao] = React.useState(isoToday());
  const [dataIntimacao, setDataIntimacao] = React.useState("");
  const [relator, setRelator] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTipo("RECURSO_ORDINARIO");
    setDataInterposicao(isoToday());
    setDataIntimacao("");
    setRelator("");
    setObservacoes("");
    setErro(null);
  }, [open]);

  const seq = proximaSequencial(tipo);
  const numeroPreview = `${baseNumero}${TCE_RECURSO_CODE[tipo]}${pad3(seq)}`;
  const prazoCfg = PRAZOS_RECURSOS_TCE[tipo];

  async function salvar() {
    setErro(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/tce/subprocessos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processoPaiId,
          subprocessoPaiId,
          tipoRecurso: tipo,
          dataInterposicao,
          dataIntimacao: dataIntimacao || null,
          relator: relator.trim() || null,
          observacoes: observacoes.trim() || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error ?? "Erro ao interpor recurso");
        return;
      }
      toast({ title: `Recurso ${json.numero} interposto` });
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Interpor recurso</DialogTitle>
          <DialogDescription>
            Cria um subprocesso vinculado ao{" "}
            {subprocessoPaiId ? "subprocesso" : "processo"} pai.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
            <Label>Numero gerado</Label>
            <Input value={numeroPreview} disabled className="font-mono" />
            <p className="text-[11px] text-muted-foreground">
              Sequencial #{pad3(seq)} dentro do pai.
            </p>
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

          <div className="space-y-1.5">
            <Label>Relator (opcional)</Label>
            <Input
              value={relator}
              onChange={(e) => setRelator(e.target.value)}
              placeholder="Nome do conselheiro relator"
            />
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
            {submitting ? "Salvando..." : "Interpor recurso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
