"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

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
import { BANCAS, bancaBadgeClasses } from "@/lib/bancas";
import { OBJETO_CONTRATO_PADRAO } from "@/lib/financeiro";
import { cn } from "@/lib/utils";

type MunicipioOpt = { id: string; nome: string; uf: string };

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  municipios: MunicipioOpt[];
  onSuccess: () => void;
};

export function CadastrarContratoDialog({
  open,
  onOpenChange,
  municipios,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [busca, setBusca] = React.useState("");
  const [municipioId, setMunicipioId] = React.useState("");
  const [bancas, setBancas] = React.useState<Set<string>>(new Set());
  const [valorMensal, setValorMensal] = React.useState("");
  const [dataInicio, setDataInicio] = React.useState("");
  const [dataFim, setDataFim] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");
  const [gerarNotas, setGerarNotas] = React.useState(true);
  const [dataRenovacao, setDataRenovacao] = React.useState("");
  const [diasAviso, setDiasAviso] = React.useState("60");
  const [obsRenovacao, setObsRenovacao] = React.useState("");
  // Dados do contrato (formalizacao)
  const [numeroContrato, setNumeroContrato] = React.useState("");
  const [cnpjContratante, setCnpjContratante] = React.useState("");
  const [orgaoContratante, setOrgaoContratante] = React.useState("");
  const [representante, setRepresentante] = React.useState("");
  const [cargoRepresentante, setCargoRepresentante] = React.useState("");
  const [objetoDoContrato, setObjetoDoContrato] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setBusca("");
      setMunicipioId("");
      setBancas(new Set());
      setValorMensal("");
      setDataInicio("");
      setDataFim("");
      setObservacoes("");
      setGerarNotas(true);
      setDataRenovacao("");
      setDiasAviso("60");
      setObsRenovacao("");
      setNumeroContrato("");
      setCnpjContratante("");
      setOrgaoContratante("");
      setRepresentante("");
      setCargoRepresentante("");
      setObjetoDoContrato("");
    }
  }, [open]);

  function toggleBanca(slug: string) {
    setBancas((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const municipiosFiltrados = React.useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return municipios.slice(0, 30);
    return municipios
      .filter((m) => m.nome.toLowerCase().includes(q))
      .slice(0, 30);
  }, [busca, municipios]);

  async function salvar() {
    if (!municipioId) {
      toast({ variant: "destructive", title: "Selecione o municipio" });
      return;
    }
    if (bancas.size === 0) {
      toast({
        variant: "destructive",
        title: "Selecione pelo menos uma banca",
      });
      return;
    }
    const valorTrim = valorMensal.trim();
    if (!valorTrim) {
      toast({ variant: "destructive", title: "Valor mensal obrigatorio" });
      return;
    }
    const limpo = valorTrim
      .replace(/\s+/g, "")
      .replace(/[R$]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const valor = Number(limpo);
    if (!Number.isFinite(valor) || valor <= 0) {
      toast({
        variant: "destructive",
        title: "Valor mensal invalido",
        description: `Nao foi possivel interpretar "${valorMensal}". Use formato como 1500 ou 1.500,50.`,
      });
      return;
    }
    if (!dataInicio) {
      toast({ variant: "destructive", title: "Data de inicio obrigatoria" });
      return;
    }
    if (dataFim && dataFim < dataInicio) {
      toast({
        variant: "destructive",
        title: "Data fim nao pode ser anterior a data de inicio",
      });
      return;
    }
    const objeto = objetoDoContrato.trim();
    if (objeto.length < 20) {
      toast({
        variant: "destructive",
        title: "Objeto do contrato obrigatorio",
        description:
          "Descreva com pelo menos 20 caracteres. Use 'Sugerir Texto Padrao' para preencher.",
      });
      return;
    }

    setPending(true);
    try {
      let res: Response;
      try {
        res = await fetch("/api/financeiro/contratos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            municipioId,
            bancasSlug: Array.from(bancas),
            valorMensal: valor,
            dataInicio,
            dataFim: dataFim || null,
            observacoes: observacoes.trim() || null,
            gerarNotasAutomaticas: gerarNotas,
            dataRenovacao: dataRenovacao || null,
            diasAvisoRenovacao: parseInt(diasAviso, 10) || 60,
            observacoesRenovacao: obsRenovacao.trim() || null,
            numeroContrato: numeroContrato.trim() || null,
            cnpjContratante: cnpjContratante.trim() || null,
            orgaoContratante: orgaoContratante.trim() || null,
            representanteContratante: representante.trim() || null,
            cargoRepresentante: cargoRepresentante.trim() || null,
            objetoDoContrato: objeto,
          }),
        });
      } catch (errFetch) {
        console.error("[CadastrarContrato] erro de rede:", errFetch);
        toast({
          variant: "destructive",
          title: "Erro de conexao",
          description:
            "Nao foi possivel conectar ao servidor. Verifique sua internet e tente novamente.",
        });
        return;
      }

      let json: { error?: string; id?: string; notasGeradas?: number } = {};
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          json = await res.json();
        } catch (errJson) {
          console.error("[CadastrarContrato] erro ao parsear JSON:", errJson);
        }
      } else {
        const txt = await res.text().catch(() => "");
        console.error(
          "[CadastrarContrato] resposta nao-JSON:",
          res.status,
          txt.slice(0, 500),
        );
      }

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao cadastrar contrato",
          description:
            json.error ??
            `Status ${res.status}: tente novamente ou abra o console (F12) para detalhes.`,
        });
        return;
      }
      toast({
        title: "Contrato cadastrado",
        description:
          json.notasGeradas && json.notasGeradas > 0
            ? `${json.notasGeradas} nota(s) geradas automaticamente.`
            : undefined,
      });
      onOpenChange(false);
      onSuccess();
    } catch (errOuter) {
      console.error("[CadastrarContrato] erro inesperado:", errOuter);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description:
          errOuter instanceof Error
            ? errOuter.message
            : "Veja o console (F12) para mais detalhes.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar contrato municipal</DialogTitle>
          <DialogDescription>
            Honorario contratual mensal. As notas serao geradas
            automaticamente desde a data de inicio ate dezembro do ano corrente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>
              Municipio <span className="text-red-600">*</span>
            </Label>
            <Input
              placeholder="Buscar municipio por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto rounded-md border">
              {municipiosFiltrados.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMunicipioId(m.id)}
                  className={cn(
                    "block w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50",
                    municipioId === m.id &&
                      "bg-blue-50 font-semibold text-blue-900",
                  )}
                >
                  {m.nome}/{m.uf}
                </button>
              ))}
              {municipiosFiltrados.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">
                  Nenhum municipio encontrado.
                </p>
              )}
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
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 transition-colors",
                      ativo
                        ? bancaBadgeClasses(b.cor)
                        : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {b.nome}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>
                Valor mensal (R$) <span className="text-red-600">*</span>
              </Label>
              <Input
                placeholder="0,00"
                value={valorMensal}
                onChange={(e) => setValorMensal(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Data inicio <span className="text-red-600">*</span>
              </Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data fim (opcional)</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Dados do contrato (formalizacao)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Numero do contrato</Label>
                <Input
                  placeholder="Ex.: 015/2025"
                  value={numeroContrato}
                  onChange={(e) => setNumeroContrato(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CNPJ do contratante</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={cnpjContratante}
                  onChange={(e) => setCnpjContratante(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              <Label className="text-xs">Orgao contratante</Label>
              <Input
                placeholder="Ex.: Prefeitura Municipal de Recife"
                value={orgaoContratante}
                onChange={(e) => setOrgaoContratante(e.target.value)}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Representante</Label>
                <Input
                  placeholder="Nome do representante legal"
                  value={representante}
                  onChange={(e) => setRepresentante(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cargo do representante</Label>
                <Input
                  placeholder="Ex.: Prefeito"
                  value={cargoRepresentante}
                  onChange={(e) => setCargoRepresentante(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border-2 border-brand-navy/40 bg-brand-navy/5 p-3 ring-1 ring-brand-navy/10">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label className="text-sm font-semibold text-brand-navy">
                Objeto do contrato <span className="text-red-600">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                onClick={() => setObjetoDoContrato(OBJETO_CONTRATO_PADRAO)}
              >
                <Sparkles className="h-3 w-3" />
                Sugerir Texto Padrao
              </Button>
            </div>
            <Textarea
              rows={6}
              value={objetoDoContrato}
              onChange={(e) => setObjetoDoContrato(e.target.value)}
              placeholder="Descreva o objeto do contrato (servicos prestados, escopo de atuacao). Clique em 'Sugerir Texto Padrao' para preencher com o texto padrao do escritorio."
              className="min-h-[120px] border-brand-navy/20 bg-white"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Aparece no resumo do contrato e na secao &quot;I - DO CONTRATO
              ORIGINAL&quot; do .docx de aditivo.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={gerarNotas}
              onChange={(e) => setGerarNotas(e.target.checked)}
            />
            <span>
              Gerar notas automaticamente desde a data de inicio ate dezembro
              do ano corrente
            </span>
          </label>

          <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
              Renovacao (opcional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data de renovacao</Label>
                <Input
                  type="date"
                  value={dataRenovacao}
                  onChange={(e) => setDataRenovacao(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Avisar com (dias de antecedencia)</Label>
                <Input
                  type="number"
                  min="0"
                  max="365"
                  value={diasAviso}
                  onChange={(e) => setDiasAviso(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-2 space-y-1.5">
              <Label className="text-xs">Observacoes de renovacao</Label>
              <Textarea
                rows={2}
                value={obsRenovacao}
                onChange={(e) => setObsRenovacao(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
