"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";

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
import { TIPOS_RECURSO } from "@/lib/tjpe-config";

export type ItemPautaJudicialInitial = {
  id: string;
  numeroProcesso: string;
  tituloProcesso: string | null;
  tipoRecurso: string | null;
  partes: string | null;
  relator: string;
  advogadoResp: string;
  situacao: string | null;
  prognostico: string | null;
  observacoes: string | null;
  providencia: string | null;
  sustentacaoOral: boolean;
  advogadoSustentacao: string | null;
  sessaoVirtual: boolean;
  pedidoRetPresencial: boolean;
  retiradoDePauta: boolean;
  pedidoVistas: boolean;
  desPedidoVistas: string | null;
  processo: { id: string; numero: string } | null;
};

export type ProcessoJudicialOption = {
  id: string;
  numero: string;
  gestor: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  sessaoId: string;
  item?: ItemPautaJudicialInitial;
  advogadosCadastrados: string[];
  desembargadores: string[];
  processosJudiciais: ProcessoJudicialOption[];
  canEdit: boolean;
};

const LIST_IDS = {
  desembargadores: "pautas-desembargadores-list",
  advogados: "pautas-advogados-list",
  processos: "pautas-processos-list",
};

const TIPO_RECURSO_NONE = "__none__";

export function ItemPautaJudicialDialog({
  open,
  onOpenChange,
  mode,
  sessaoId,
  item,
  advogadosCadastrados,
  desembargadores,
  processosJudiciais,
  canEdit,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [numeroProcesso, setNumeroProcesso] = React.useState("");
  const [copiando, setCopiando] = React.useState(false);
  const [tituloProcesso, setTituloProcesso] = React.useState("");
  const [tipoRecurso, setTipoRecurso] = React.useState("");
  const [partes, setPartes] = React.useState("");
  const [relator, setRelator] = React.useState("");
  const [advogadoResp, setAdvogadoResp] = React.useState("");
  const [situacao, setSituacao] = React.useState("");
  const [prognostico, setPrognostico] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [providencia, setProvidencia] = React.useState("");
  const [processoNumero, setProcessoNumero] = React.useState("");
  const [sustentacaoOral, setSustentacaoOral] = React.useState(false);
  const [advogadoSustentacao, setAdvogadoSustentacao] = React.useState("");
  const [sessaoVirtual, setSessaoVirtual] = React.useState(false);
  const [pedidoRetPresencial, setPedidoRetPresencial] = React.useState(false);
  const [retiradoDePauta, setRetiradoDePauta] = React.useState(false);
  const [pedidoVistas, setPedidoVistas] = React.useState(false);
  const [desPedidoVistas, setDesPedidoVistas] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && item) {
      setNumeroProcesso(item.numeroProcesso);
      setTituloProcesso(item.tituloProcesso ?? "");
      setTipoRecurso(item.tipoRecurso ?? "");
      setPartes(item.partes ?? "");
      setRelator(item.relator);
      setAdvogadoResp(item.advogadoResp);
      setSituacao(item.situacao ?? "");
      setPrognostico(item.prognostico ?? "");
      setObservacoes(item.observacoes ?? "");
      setProvidencia(item.providencia ?? "");
      setProcessoNumero(item.processo?.numero ?? "");
      setSustentacaoOral(item.sustentacaoOral);
      setAdvogadoSustentacao(item.advogadoSustentacao ?? "");
      setSessaoVirtual(item.sessaoVirtual);
      setPedidoRetPresencial(item.pedidoRetPresencial);
      setRetiradoDePauta(item.retiradoDePauta);
      setPedidoVistas(item.pedidoVistas);
      setDesPedidoVistas(item.desPedidoVistas ?? "");
    } else {
      setNumeroProcesso("");
      setTituloProcesso("");
      setTipoRecurso("");
      setPartes("");
      setRelator("");
      setAdvogadoResp("");
      setSituacao("");
      setPrognostico("");
      setObservacoes("");
      setProvidencia("");
      setProcessoNumero("");
      setSustentacaoOral(false);
      setAdvogadoSustentacao("");
      setSessaoVirtual(false);
      setPedidoRetPresencial(false);
      setRetiradoDePauta(false);
      setPedidoVistas(false);
      setDesPedidoVistas("");
    }
  }, [open, mode, item]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!numeroProcesso.trim()) {
      toast({ variant: "destructive", title: "Informe o numero do processo" });
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

    const processoMatch = processoNumero.trim()
      ? processosJudiciais.find(
          (p) => p.numero.toLowerCase() === processoNumero.trim().toLowerCase(),
        )
      : null;

    const payload: Record<string, unknown> = {
      numeroProcesso: numeroProcesso.trim(),
      tituloProcesso: tituloProcesso.trim() || null,
      tipoRecurso: tipoRecurso.trim() || null,
      partes: partes.trim() || null,
      relator: relator.trim(),
      advogadoResp: advogadoResp.trim(),
      situacao: situacao.trim() || null,
      prognostico: prognostico.trim() || null,
      observacoes: observacoes.trim() || null,
      providencia: providencia.trim() || null,
      sustentacaoOral,
      advogadoSustentacao: sustentacaoOral
        ? advogadoSustentacao.trim() || null
        : null,
      sessaoVirtual,
      pedidoRetPresencial,
      retiradoDePauta,
      pedidoVistas,
      desPedidoVistas: pedidoVistas ? desPedidoVistas.trim() || null : null,
      processoId: processoMatch?.id ?? null,
    };

    const isEdit = mode === "edit" && item?.id;
    const url = isEdit
      ? `/api/pautas/itens/${item!.id}`
      : "/api/pautas/itens";
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

  async function copiarDePautaAnterior() {
    const numero = numeroProcesso.trim();
    if (!numero) {
      toast({
        variant: "destructive",
        title: "Informe o numero do processo primeiro",
      });
      return;
    }
    setCopiando(true);
    try {
      const params = new URLSearchParams({ numero });
      if (mode === "edit") params.set("excludeSessaoId", sessaoId);
      const res = await fetch(
        `/api/pautas/itens/buscar-anterior?${params.toString()}`,
      );
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao buscar pauta anterior",
        });
        return;
      }
      const json = await res.json();
      if (!json.found) {
        toast({
          title: "Nenhum item anterior encontrado",
          description: "Nao foi achada sessao anterior com este numero.",
        });
        return;
      }
      const it = json.item as {
        tituloProcesso: string | null;
        tipoRecurso: string | null;
        partes: string | null;
        relator: string;
        advogadoResp: string;
        situacao: string | null;
        prognostico: string | null;
        observacoes: string | null;
        providencia: string | null;
        sustentacaoOral: boolean;
        advogadoSustentacao: string | null;
        sessaoVirtual: boolean;
        pedidoRetPresencial: boolean;
      };
      const s = json.sessao as {
        data: string;
        orgaoJulgador: string;
      };
      setTituloProcesso(it.tituloProcesso ?? "");
      setTipoRecurso(it.tipoRecurso ?? "");
      setPartes(it.partes ?? "");
      setRelator(it.relator);
      setAdvogadoResp(it.advogadoResp);
      setSituacao(it.situacao ?? "");
      setPrognostico(it.prognostico ?? "");
      setObservacoes(it.observacoes ?? "");
      setProvidencia(it.providencia ?? "");
      setSustentacaoOral(it.sustentacaoOral);
      setAdvogadoSustentacao(it.advogadoSustentacao ?? "");
      setSessaoVirtual(it.sessaoVirtual);
      setPedidoRetPresencial(it.pedidoRetPresencial);
      const dataFmt = s.data.slice(0, 10).split("-").reverse().join("/");
      toast({
        title: "Dados copiados",
        description: `Copiado de sessao de ${s.orgaoJulgador} (${dataFmt}).`,
      });
    } finally {
      setCopiando(false);
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
              Dados do processo que sera julgado na sessao do TJPE.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr]">
              <div className="space-y-1.5">
                <Label>
                  Numero do processo <span className="text-red-600">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={numeroProcesso}
                    onChange={(e) => setNumeroProcesso(e.target.value)}
                    placeholder="Ex.: 0001542-12.2026.8.17.2001"
                    className="flex-1"
                  />
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copiarDePautaAnterior}
                      disabled={copiando || !numeroProcesso.trim()}
                      title="Buscar dados deste processo em sessoes anteriores"
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      {copiando ? "Buscando..." : "Copiar de pauta anterior"}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de recurso</Label>
                <Select
                  value={tipoRecurso || TIPO_RECURSO_NONE}
                  onValueChange={(v) =>
                    setTipoRecurso(v === TIPO_RECURSO_NONE ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TIPO_RECURSO_NONE}>—</SelectItem>
                    {TIPOS_RECURSO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Titulo/Descricao curta</Label>
              <Input
                value={tituloProcesso}
                onChange={(e) => setTituloProcesso(e.target.value)}
                placeholder="Ex.: Apelacao contra Municipio de Arco Verde"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vincular a processo cadastrado (opcional)</Label>
              <Input
                list={LIST_IDS.processos}
                value={processoNumero}
                onChange={(e) => setProcessoNumero(e.target.value)}
                placeholder="Digite o numero para buscar entre os processos judiciais"
              />
              <p className="text-[11px] text-muted-foreground">
                Apenas vincula quando o numero bater exatamente com um processo
                ja cadastrado.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Partes</Label>
              <Textarea
                rows={2}
                value={partes}
                onChange={(e) => setPartes(e.target.value)}
                placeholder="Ex.: Municipio de Arco Verde x Ministerio Publico Estadual"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Relator <span className="text-red-600">*</span>
                </Label>
                <Input
                  list={LIST_IDS.desembargadores}
                  value={relator}
                  onChange={(e) => setRelator(e.target.value)}
                  placeholder="Ex.: Fernando Cerqueira Norberto dos Santos"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Advogado responsavel <span className="text-red-600">*</span>
                </Label>
                <Input
                  list={LIST_IDS.advogados}
                  value={advogadoResp}
                  onChange={(e) => setAdvogadoResp(e.target.value)}
                  placeholder="Ex.: Gabriel Moura"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Situacao</Label>
              <Textarea
                rows={2}
                value={situacao}
                onChange={(e) => setSituacao(e.target.value)}
                placeholder="Ex.: Preliminares de merito em discussao"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prognostico</Label>
              <Textarea
                rows={2}
                value={prognostico}
                onChange={(e) => setPrognostico(e.target.value)}
                placeholder="Ex.: Provimento parcial"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Providencia</Label>
              <Textarea
                rows={2}
                value={providencia}
                onChange={(e) => setProvidencia(e.target.value)}
                placeholder="Ex.: Sustentacao oral"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observacoes</Label>
              <Textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Outras anotacoes"
              />
            </div>
            <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sustentacaoOral}
                    onChange={(e) => setSustentacaoOral(e.target.checked)}
                  />
                  Sustentacao oral
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sessaoVirtual}
                    onChange={(e) => setSessaoVirtual(e.target.checked)}
                  />
                  Sessao virtual
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pedidoRetPresencial}
                    onChange={(e) => setPedidoRetPresencial(e.target.checked)}
                  />
                  Pedido de retirada p/ presencial
                </label>
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
              </div>
              {sustentacaoOral && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Advogado que vai sustentar
                  </Label>
                  <Input
                    list={LIST_IDS.advogados}
                    value={advogadoSustentacao}
                    onChange={(e) => setAdvogadoSustentacao(e.target.value)}
                    placeholder="Ex.: Gabriel Moura"
                  />
                </div>
              )}
              {pedidoVistas && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Desembargador que pediu vistas
                  </Label>
                  <Input
                    list={LIST_IDS.desembargadores}
                    value={desPedidoVistas}
                    onChange={(e) => setDesPedidoVistas(e.target.value)}
                    placeholder="Ex.: Waldemir Tavares de Albuquerque Filho"
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

      <datalist id={LIST_IDS.desembargadores}>
        {desembargadores.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id={LIST_IDS.advogados}>
        {advogadosCadastrados.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <datalist id={LIST_IDS.processos}>
        {processosJudiciais.map((p) => (
          <option key={p.id} value={p.numero} label={p.gestor} />
        ))}
      </datalist>
    </>
  );
}
