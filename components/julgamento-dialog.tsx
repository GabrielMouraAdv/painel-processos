"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { TipoProcesso, TipoProcessoTce } from "@prisma/client";
import { Gavel, Loader2 } from "lucide-react";

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
  PENALIDADES_JUD,
  PENALIDADES_TCE,
  RESULTADOS_POR_TIPO_JUD,
  RESULTADOS_POR_TIPO_TCE,
  judTemPenalidade,
  tceTemPenalidade,
} from "@/lib/julgamento-config";

type Initial = {
  dataJulgamento: string | null; // ISO
  resultadoJulgamento: string | null;
  penalidade: string | null;
  valorMulta: number | null;
  valorDevolucao: number | null;
  valorCondenacao: number | null;
  observacoesJulgamento: string | null;
};

type Props =
  | {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      escopo: "tce";
      processoId: string;
      tipo: TipoProcessoTce;
      initial?: Initial | null;
    }
  | {
      open: boolean;
      onOpenChange: (v: boolean) => void;
      escopo: "judicial";
      processoId: string;
      tipo: TipoProcesso;
      initial?: Initial | null;
    };

function isoToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function JulgamentoDialog(props: Props) {
  const { open, onOpenChange, escopo, processoId, initial } = props;
  const router = useRouter();
  const { toast } = useToast();

  const resultados =
    escopo === "tce"
      ? RESULTADOS_POR_TIPO_TCE[props.tipo]
      : RESULTADOS_POR_TIPO_JUD[props.tipo];
  const penalidades = escopo === "tce" ? PENALIDADES_TCE : PENALIDADES_JUD;

  const [data, setData] = React.useState(
    initial?.dataJulgamento ? initial.dataJulgamento.slice(0, 10) : isoToday(),
  );
  const [resultado, setResultado] = React.useState(
    initial?.resultadoJulgamento ?? "",
  );
  const [penalidade, setPenalidade] = React.useState(
    initial?.penalidade ?? "",
  );
  const [valorMulta, setValorMulta] = React.useState(
    initial?.valorMulta != null ? String(initial.valorMulta) : "",
  );
  const [valorDevolucao, setValorDevolucao] = React.useState(
    initial?.valorDevolucao != null ? String(initial.valorDevolucao) : "",
  );
  const [valorCondenacao, setValorCondenacao] = React.useState(
    initial?.valorCondenacao != null ? String(initial.valorCondenacao) : "",
  );
  const [observacoes, setObservacoes] = React.useState(
    initial?.observacoesJulgamento ?? "",
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setData(
      initial?.dataJulgamento
        ? initial.dataJulgamento.slice(0, 10)
        : isoToday(),
    );
    setResultado(initial?.resultadoJulgamento ?? "");
    setPenalidade(initial?.penalidade ?? "");
    setValorMulta(
      initial?.valorMulta != null ? String(initial.valorMulta) : "",
    );
    setValorDevolucao(
      initial?.valorDevolucao != null ? String(initial.valorDevolucao) : "",
    );
    setValorCondenacao(
      initial?.valorCondenacao != null ? String(initial.valorCondenacao) : "",
    );
    setObservacoes(initial?.observacoesJulgamento ?? "");
    setErro(null);
  }, [open, initial]);

  const mostraPenalidade =
    escopo === "tce"
      ? tceTemPenalidade(resultado)
      : judTemPenalidade(resultado);

  const incluiMulta =
    escopo === "tce" && /multa/i.test(penalidade);
  const incluiDevolucao =
    escopo === "tce" && /devoluc/i.test(penalidade);
  const incluiCondenacao =
    escopo === "judicial" && /condenacao pecuniaria/i.test(penalidade);

  function parseValor(v: string): number | null {
    if (!v.trim()) return null;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function salvar() {
    setErro(null);
    if (!resultado) {
      setErro("Selecione o resultado do julgamento.");
      return;
    }
    if (!data) {
      setErro("Informe a data do julgamento.");
      return;
    }
    setSubmitting(true);
    try {
      const apiPath =
        escopo === "tce" ? "/api/tce/pendencias" : "/api/pendencias";
      const body: Record<string, unknown> = {
        acao: "registrar_julgamento",
        processoId,
        dataJulgamento: data,
        resultadoJulgamento: resultado,
        penalidade: mostraPenalidade ? penalidade || null : null,
        observacoesJulgamento: observacoes.trim() || null,
      };
      if (escopo === "tce") {
        body.valorMulta = incluiMulta ? parseValor(valorMulta) : null;
        body.valorDevolucao = incluiDevolucao
          ? parseValor(valorDevolucao)
          : null;
      } else {
        body.valorCondenacao = incluiCondenacao
          ? parseValor(valorCondenacao)
          : null;
      }
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(json.error ?? "Falha ao registrar julgamento");
        return;
      }
      toast({
        title: initial ? "Julgamento atualizado" : "Julgamento registrado",
      });
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar Julgamento" : "Registrar Julgamento"}
          </DialogTitle>
          <DialogDescription>
            Informe a data, o resultado e os detalhes da decisao.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>
              Data do julgamento <span className="text-red-600">*</span>
            </Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Resultado <span className="text-red-600">*</span>
            </Label>
            <Select value={resultado} onValueChange={setResultado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o resultado" />
              </SelectTrigger>
              <SelectContent>
                {resultados.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mostraPenalidade && (
            <div className="space-y-1.5">
              <Label>Penalidade</Label>
              <Select value={penalidade} onValueChange={setPenalidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a penalidade" />
                </SelectTrigger>
                <SelectContent>
                  {penalidades.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {incluiMulta && (
            <div className="space-y-1.5">
              <Label>Valor da multa (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorMulta}
                onChange={(e) => setValorMulta(e.target.value)}
                placeholder="0,00"
              />
            </div>
          )}
          {incluiDevolucao && (
            <div className="space-y-1.5">
              <Label>Valor da devolucao ao erario (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorDevolucao}
                onChange={(e) => setValorDevolucao(e.target.value)}
                placeholder="0,00"
              />
            </div>
          )}
          {incluiCondenacao && (
            <div className="space-y-1.5">
              <Label>Valor da condenacao (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorCondenacao}
                onChange={(e) => setValorCondenacao(e.target.value)}
                placeholder="0,00"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Observacoes do julgamento</Label>
            <Textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ementa, voto vencido, fundamentacao relevante..."
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
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Gavel className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
