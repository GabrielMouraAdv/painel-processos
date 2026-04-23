"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
import { calcularDataVencimento } from "@/lib/dias-uteis";

export type AdvogadoOption = { id: string; nome: string };
export type ProcessoTceOption = {
  id: string;
  numero: string;
  municipio: string | null;
};

export type PrazoTceInitial = {
  id: string;
  tipo: string;
  dataIntimacao: string;
  dataVencimento: string;
  diasUteis: number;
  prorrogavel: boolean;
  prorrogacaoPedida: boolean;
  dataProrrogacao: string | null;
  cumprido: boolean;
  observacoes: string | null;
  advogadoResp: { id: string; nome: string } | null;
  processo?: { id: string; numero: string };
};

type Props = {
  mode: "create" | "edit";
  prazo?: PrazoTceInitial;
  processoId?: string;
  processos?: ProcessoTceOption[];
  advogados: AdvogadoOption[];
  onSuccess: () => void;
  onCancel?: () => void;
  submitLabel?: string;
};

function toDateInput(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PrazoTceForm({
  mode,
  prazo,
  processoId,
  processos,
  advogados,
  onSuccess,
  onCancel,
  submitLabel,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [selectedProcessoId, setSelectedProcessoId] = React.useState(
    prazo?.processo?.id ?? processoId ?? "",
  );
  const [tipo, setTipo] = React.useState(prazo?.tipo ?? "");
  const [dataIntimacao, setDataIntimacao] = React.useState(
    prazo ? toDateInput(prazo.dataIntimacao) : new Date().toISOString().slice(0, 10),
  );
  const [diasUteis, setDiasUteis] = React.useState(
    prazo ? String(prazo.diasUteis) : "30",
  );
  const [dataVencimento, setDataVencimento] = React.useState(
    prazo ? toDateInput(prazo.dataVencimento) : "",
  );
  const [prorrogavel, setProrrogavel] = React.useState(prazo?.prorrogavel ?? true);
  const [advogadoRespId, setAdvogadoRespId] = React.useState(
    prazo?.advogadoResp?.id ?? "",
  );
  const [observacoes, setObservacoes] = React.useState(prazo?.observacoes ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  // Recalcula vencimento automaticamente ao mudar data de intimacao ou dias uteis
  const initialDataVenc = React.useRef(prazo ? toDateInput(prazo.dataVencimento) : "");
  React.useEffect(() => {
    if (!dataIntimacao || !diasUteis) return;
    const n = Number(diasUteis);
    if (!Number.isFinite(n) || n <= 0) return;
    const v = calcularDataVencimento(dataIntimacao, n);
    setDataVencimento(toDateInput(v));
  }, [dataIntimacao, diasUteis]);

  React.useEffect(() => {
    // Se o usuario acabou de abrir edit, preservar o vencimento original
    if (mode === "edit" && initialDataVenc.current) {
      setDataVencimento(initialDataVenc.current);
      initialDataVenc.current = "";
    }
  }, [mode]);

  const showProcessoSelect = mode === "create" && !processoId && !!processos;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo.trim()) {
      toast({ variant: "destructive", title: "Informe o tipo do prazo" });
      return;
    }
    if (!advogadoRespId) {
      toast({
        variant: "destructive",
        title: "Selecione o advogado responsavel",
      });
      return;
    }
    if (showProcessoSelect && !selectedProcessoId) {
      toast({ variant: "destructive", title: "Selecione o processo" });
      return;
    }
    if (!dataIntimacao || !dataVencimento || !diasUteis) {
      toast({ variant: "destructive", title: "Preencha as datas" });
      return;
    }

    const isEdit = mode === "edit" && prazo?.id;
    const url = isEdit ? `/api/tce/prazos/${prazo!.id}` : "/api/tce/prazos";
    const method = isEdit ? "PATCH" : "POST";

    const basePayload: Record<string, unknown> = {
      tipo: tipo.trim(),
      dataIntimacao,
      dataVencimento,
      diasUteis: Number(diasUteis),
      prorrogavel,
      advogadoRespId,
      observacoes: observacoes.trim() || null,
    };
    if (!isEdit) {
      basePayload.processoId = processoId ?? selectedProcessoId;
    }

    setSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(basePayload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: isEdit ? "Erro ao atualizar prazo" : "Erro ao criar prazo",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: isEdit ? "Prazo atualizado" : "Prazo cadastrado" });
      onSuccess();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {showProcessoSelect && (
        <div className="space-y-1.5">
          <Label>Processo TCE</Label>
          <Select value={selectedProcessoId} onValueChange={setSelectedProcessoId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o processo" />
            </SelectTrigger>
            <SelectContent>
              {processos!.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.numero} {p.municipio ? `— ${p.municipio}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Tipo do prazo</Label>
        <Input
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          placeholder="Ex.: Defesa Previa, Embargos de Declaracao..."
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Intimacao</Label>
          <Input
            type="date"
            value={dataIntimacao}
            onChange={(e) => setDataIntimacao(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Dias uteis</Label>
          <Input
            type="number"
            min={1}
            value={diasUteis}
            onChange={(e) => setDiasUteis(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Vencimento</Label>
          <Input
            type="date"
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>
          Advogado responsavel <span className="text-red-600">*</span>
        </Label>
        <Select value={advogadoRespId} onValueChange={setAdvogadoRespId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o advogado" />
          </SelectTrigger>
          <SelectContent>
            {advogados.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={prorrogavel}
          onChange={(e) => setProrrogavel(e.target.checked)}
        />
        Prorrogavel
      </label>
      <div className="space-y-1.5">
        <Label>Observacoes</Label>
        <Textarea
          rows={2}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>
      <DialogFooter>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={submitting}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          {submitting
            ? "Salvando..."
            : submitLabel ?? (mode === "edit" ? "Salvar alteracoes" : "Cadastrar prazo")}
        </Button>
      </DialogFooter>
    </form>
  );
}
