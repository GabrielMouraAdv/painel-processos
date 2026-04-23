"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

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

export type ItemPautaInitial = {
  id: string;
  numeroProcesso: string;
  tituloProcesso: string | null;
  municipio: string;
  exercicio: string | null;
  relator: string;
  advogadoResp: string;
  situacao: string | null;
  observacoes: string | null;
  prognostico: string | null;
  providencia: string | null;
  retiradoDePauta: boolean;
  pedidoVistas: boolean;
  conselheiroVistas: string | null;
  processoTce: { id: string; numero: string } | null;
};

export type ProcessoTceOption = {
  id: string;
  numero: string;
  municipio: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  sessaoId: string;
  item?: ItemPautaInitial;
  advogadosCadastrados: string[];
  municipiosCadastrados: string[];
  relatoresPadrao: string[];
  processosTce: ProcessoTceOption[];
};

const LIST_IDS = {
  municipios: "pauta-municipios-list",
  relatores: "pauta-relatores-list",
  advogados: "pauta-advogados-list",
  processos: "pauta-processos-list",
};

export function ItemPautaDialog({
  open,
  onOpenChange,
  mode,
  sessaoId,
  item,
  advogadosCadastrados,
  municipiosCadastrados,
  relatoresPadrao,
  processosTce,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [numeroProcesso, setNumeroProcesso] = React.useState("");
  const [tituloProcesso, setTituloProcesso] = React.useState("");
  const [processoTceNumero, setProcessoTceNumero] = React.useState("");
  const [municipio, setMunicipio] = React.useState("");
  const [exercicio, setExercicio] = React.useState("");
  const [relator, setRelator] = React.useState("");
  const [advogadoResp, setAdvogadoResp] = React.useState("");
  const [situacao, setSituacao] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [prognostico, setPrognostico] = React.useState("");
  const [providencia, setProvidencia] = React.useState("");
  const [retiradoDePauta, setRetiradoDePauta] = React.useState(false);
  const [pedidoVistas, setPedidoVistas] = React.useState(false);
  const [conselheiroVistas, setConselheiroVistas] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && item) {
      setNumeroProcesso(item.numeroProcesso);
      setTituloProcesso(item.tituloProcesso ?? "");
      setProcessoTceNumero(item.processoTce?.numero ?? "");
      setMunicipio(item.municipio);
      setExercicio(item.exercicio ?? "");
      setRelator(item.relator);
      setAdvogadoResp(item.advogadoResp);
      setSituacao(item.situacao ?? "");
      setObservacoes(item.observacoes ?? "");
      setPrognostico(item.prognostico ?? "");
      setProvidencia(item.providencia ?? "");
      setRetiradoDePauta(item.retiradoDePauta);
      setPedidoVistas(item.pedidoVistas);
      setConselheiroVistas(item.conselheiroVistas ?? "");
    } else {
      setNumeroProcesso("");
      setTituloProcesso("");
      setProcessoTceNumero("");
      setMunicipio("");
      setExercicio("");
      setRelator("");
      setAdvogadoResp("");
      setSituacao("");
      setObservacoes("");
      setPrognostico("");
      setProvidencia("");
      setRetiradoDePauta(false);
      setPedidoVistas(false);
      setConselheiroVistas("");
    }
  }, [open, mode, item]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!numeroProcesso.trim()) {
      toast({ variant: "destructive", title: "Informe o numero do processo" });
      return;
    }
    if (!municipio.trim()) {
      toast({ variant: "destructive", title: "Informe o municipio" });
      return;
    }
    if (!relator.trim()) {
      toast({ variant: "destructive", title: "Informe o relator" });
      return;
    }
    if (!advogadoResp.trim()) {
      toast({
        variant: "destructive",
        title: "Informe o advogado responsavel",
      });
      return;
    }

    const processoTceMatch = processoTceNumero.trim()
      ? processosTce.find(
          (p) =>
            p.numero.toLowerCase() === processoTceNumero.trim().toLowerCase(),
        )
      : null;

    const payload: Record<string, unknown> = {
      numeroProcesso: numeroProcesso.trim(),
      tituloProcesso: tituloProcesso.trim() || null,
      municipio: municipio.trim(),
      exercicio: exercicio.trim() || null,
      relator: relator.trim(),
      advogadoResp: advogadoResp.trim(),
      situacao: situacao.trim() || null,
      observacoes: observacoes.trim() || null,
      prognostico: prognostico.trim() || null,
      providencia: providencia.trim() || null,
      retiradoDePauta,
      pedidoVistas,
      conselheiroVistas: pedidoVistas
        ? conselheiroVistas.trim() || null
        : null,
      processoTceId: processoTceMatch?.id ?? null,
    };

    const isEdit = mode === "edit" && item?.id;
    const url = isEdit
      ? `/api/tce/pauta/itens/${item!.id}`
      : "/api/tce/pauta/itens";
    const method = isEdit ? "PATCH" : "POST";
    if (!isEdit) payload.sessaoId = sessaoId;

    setSubmitting(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: isEdit ? "Erro ao atualizar item" : "Erro ao criar item",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: isEdit ? "Item atualizado" : "Item adicionado" });
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? "Editar item da pauta" : "Novo item da pauta"}
            </DialogTitle>
            <DialogDescription>
              Dados do processo que sera julgado nesta sessao.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_120px]">
              <div className="space-y-1.5">
                <Label>
                  Numero do processo <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={numeroProcesso}
                  onChange={(e) => setNumeroProcesso(e.target.value)}
                  placeholder="Ex.: 26100233-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Titulo/Descricao curta</Label>
                <Input
                  value={tituloProcesso}
                  onChange={(e) => setTituloProcesso(e.target.value)}
                  placeholder="Ex.: CAUTELAR LIMPEZA URBANA"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Exercicio</Label>
                <Input
                  value={exercicio}
                  onChange={(e) => setExercicio(e.target.value)}
                  placeholder="2024"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Vincular a processo TCE cadastrado (opcional)</Label>
              <Input
                list={LIST_IDS.processos}
                value={processoTceNumero}
                onChange={(e) => setProcessoTceNumero(e.target.value)}
                placeholder="Digite o numero para buscar entre os processos TCE"
              />
              <p className="text-[11px] text-muted-foreground">
                Apenas vincula quando o numero bater exatamente com um processo
                TCE ja cadastrado no sistema.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Municipio <span className="text-red-600">*</span>
                </Label>
                <Input
                  list={LIST_IDS.municipios}
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  placeholder="Ex.: Serra Dourada"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Relator <span className="text-red-600">*</span>
                </Label>
                <Input
                  list={LIST_IDS.relatores}
                  value={relator}
                  onChange={(e) => setRelator(e.target.value)}
                  placeholder="Ex.: Eduardo Porto"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                Advogado responsavel <span className="text-red-600">*</span>
              </Label>
              <Input
                list={LIST_IDS.advogados}
                value={advogadoResp}
                onChange={(e) => setAdvogadoResp(e.target.value)}
                placeholder="Ex.: Gabriel Moura ou Paulo/Gabriel"
              />
              <p className="text-[11px] text-muted-foreground">
                Aceita nomes fora da lista (ex.: advogados externos ou duplas).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Situacao</Label>
              <Textarea
                rows={2}
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
                placeholder="Ex.: Parecer MPCO pelo improvimento do recurso"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observacoes / Prognostico</Label>
              <Textarea
                rows={2}
                value={prognostico}
                onChange={(e) => setPrognostico(e.target.value)}
                placeholder="Ex.: Cenario fechado para rejeicao dos embargos"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Providencia</Label>
              <Textarea
                rows={2}
                value={providencia}
                onChange={(e) => setProvidencia(e.target.value)}
                placeholder="Ex.: Despacho / Memorial / Sustentacao oral"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observacoes internas</Label>
              <Textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Outras anotacoes sobre o item"
              />
            </div>
            <div className="flex flex-wrap gap-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={retiradoDePauta}
                  onChange={(e) => setRetiradoDePauta(e.target.checked)}
                />
                Retirado de pauta
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={pedidoVistas}
                  onChange={(e) => setPedidoVistas(e.target.checked)}
                />
                Pedido de vistas
              </label>
              {pedidoVistas && (
                <div className="flex flex-1 items-center gap-2 text-sm">
                  <Label className="text-xs">Conselheiro que pediu vistas</Label>
                  <Input
                    list={LIST_IDS.relatores}
                    value={conselheiroVistas}
                    onChange={(e) => setConselheiroVistas(e.target.value)}
                    placeholder="Ex.: Marcos Loreto"
                    className="h-8 flex-1"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-brand-navy hover:bg-brand-navy/90"
              >
                {submitting
                  ? "Salvando..."
                  : mode === "edit"
                    ? "Salvar alteracoes"
                    : "Adicionar item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <datalist id={LIST_IDS.municipios}>
        {municipiosCadastrados.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <datalist id={LIST_IDS.relatores}>
        {relatoresPadrao.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
      <datalist id={LIST_IDS.advogados}>
        {advogadosCadastrados.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <datalist id={LIST_IDS.processos}>
        {processosTce.map((p) => (
          <option
            key={p.id}
            value={p.numero}
            label={p.municipio ?? undefined}
          />
        ))}
      </datalist>
    </>
  );
}
