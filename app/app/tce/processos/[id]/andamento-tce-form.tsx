"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { TipoProcessoTce } from "@prisma/client";

import { Button } from "@/components/ui/button";
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
import { fasesDoTipo, prazoAutomaticoDaFase } from "@/lib/tce-config";

type AdvogadoOption = { id: string; nome: string };

type Props = {
  processoId: string;
  tipo: TipoProcessoTce;
  faseAtual: string;
  advogados: AdvogadoOption[];
};

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AndamentoTceForm({
  processoId,
  tipo,
  faseAtual,
  advogados,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const fases = React.useMemo(() => fasesDoTipo(tipo), [tipo]);

  const [data, setData] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [fase, setFase] = React.useState(faseAtual);
  const [descricao, setDescricao] = React.useState("");
  const [atualizarFase, setAtualizarFase] = React.useState(true);
  const [gerarPrazo, setGerarPrazo] = React.useState(true);
  const [dataIntimacao, setDataIntimacao] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [advogadoRespId, setAdvogadoRespId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const prazoConfig = React.useMemo(
    () => prazoAutomaticoDaFase(tipo, fase),
    [tipo, fase],
  );

  const previewVencimento = React.useMemo(() => {
    if (!prazoConfig || !dataIntimacao) return null;
    return toDateInput(
      calcularDataVencimento(dataIntimacao, prazoConfig.diasUteis),
    );
  }, [prazoConfig, dataIntimacao]);

  // Ao trocar de fase, reset gerarPrazo para true se houver prazo automatico
  React.useEffect(() => {
    setGerarPrazo(!!prazoConfig);
  }, [prazoConfig]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim() || !fase) {
      toast({
        variant: "destructive",
        title: "Preencha os campos",
        description: "Fase e descricao sao obrigatorios.",
      });
      return;
    }
    if (prazoConfig && gerarPrazo) {
      if (!dataIntimacao) {
        toast({
          variant: "destructive",
          title: "Informe a data de intimacao",
        });
        return;
      }
      if (!advogadoRespId) {
        toast({
          variant: "destructive",
          title: "Selecione o advogado responsavel",
        });
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tce/andamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processoId,
          data,
          fase,
          descricao: descricao.trim(),
          atualizarFaseProcesso: atualizarFase,
          gerarPrazoAutomatico: !!prazoConfig && gerarPrazo,
          dataIntimacao: prazoConfig && gerarPrazo ? dataIntimacao : null,
          advogadoRespId:
            prazoConfig && gerarPrazo ? advogadoRespId : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao registrar andamento",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({
        title: json.prazoId
          ? "Andamento registrado e prazo automatico criado"
          : "Andamento registrado",
      });
      setDescricao("");
      setAdvogadoRespId("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Data</Label>
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fase</Label>
          <Select value={fase} onValueChange={setFase}>
            <SelectTrigger>
              <SelectValue />
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
      <div className="space-y-1.5">
        <Label>Descricao</Label>
        <Textarea
          rows={3}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descreva a movimentacao do processo"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={atualizarFase}
          onChange={(e) => setAtualizarFase(e.target.checked)}
        />
        Atualizar fase atual do processo para a fase escolhida
      </label>

      {prazoConfig && (
        <div className="rounded-md border border-brand-navy/20 bg-brand-navy/5 p-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={gerarPrazo}
              onChange={(e) => setGerarPrazo(e.target.checked)}
              className="mt-0.5"
            />
            <span className="flex-1">
              <span className="font-medium text-brand-navy">
                Gerar prazo automatico: {prazoConfig.tipo}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                ({prazoConfig.diasUteis} dias uteis
                {prazoConfig.prorrogavel ? " • prorrogavel" : " • improrrogavel"})
              </span>
            </span>
          </label>
          {gerarPrazo && (
            <div className="mt-3 space-y-3 border-t border-brand-navy/10 pt-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Data de intimacao <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={dataIntimacao}
                    onChange={(e) => setDataIntimacao(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Vencimento (preview)</Label>
                  <Input
                    type="date"
                    value={previewVencimento ?? ""}
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Advogado responsavel <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={advogadoRespId}
                  onValueChange={setAdvogadoRespId}
                >
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
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          {submitting ? "Registrando..." : "Registrar andamento"}
        </Button>
      </div>
    </form>
  );
}
