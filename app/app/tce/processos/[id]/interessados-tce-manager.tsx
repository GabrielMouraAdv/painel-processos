"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";

export type InteressadoItem = {
  id: string;
  cargo: string;
  gestor: { id: string; nome: string };
  // Julgamento individual (multa por responsavel). Valores em reais.
  resultadoIndividual: string | null;
  valorMulta: number | null;
  valorDevolucao: number | null;
  ehCliente: boolean;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
// Aceita "13.719,75", "13719,75" ou "13719.75".
function lerValor(t: string): number | null | "erro" {
  const x = t.trim().replace(/^R\$\s*/i, "");
  if (!x) return null;
  const n = Number(x.includes(",") ? x.replace(/\./g, "").replace(",", ".") : x);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : "erro";
}
const paraTexto = (v: number | null) =>
  v === null ? "" : v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export type GestorOption = {
  id: string;
  nome: string;
  tipoInteressado: "PESSOA_FISICA" | "PESSOA_JURIDICA";
  nomeFantasia?: string | null;
};

type Props = {
  processoId: string;
  interessados: InteressadoItem[];
  gestores: GestorOption[];
  // Rotulos de resultado do tipo do processo e os valores gravados no processo.
  resultados?: string[];
  valorMultaProcesso?: number | null;
  valorDevolucaoProcesso?: number | null;
};

export function InteressadosTceManager({
  processoId,
  interessados,
  gestores,
  resultados = [],
  valorMultaProcesso = null,
  valorDevolucaoProcesso = null,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [novoGestorId, setNovoGestorId] = React.useState("");
  const [novoCargo, setNovoCargo] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editando, setEditando] = React.useState<InteressadoItem | null>(null);
  const [aplicando, setAplicando] = React.useState(false);

  // Multa do processo = soma das individuais (aplicada so quando o usuario pede).
  const somar = (k: "valorMulta" | "valorDevolucao") => {
    const xs = interessados.map((i) => i[k]).filter((v): v is number => v !== null);
    return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100 : null;
  };
  const somaMulta = somar("valorMulta");
  const somaDevolucao = somar("valorDevolucao");
  const difere = (soma: number | null, atual: number | null) => soma !== null && soma !== atual;
  const somaDifere =
    difere(somaMulta, valorMultaProcesso) || difere(somaDevolucao, valorDevolucaoProcesso);

  async function aplicarSoma() {
    setAplicando(true);
    const res = await fetch("/api/tce/interessados/aplicar-soma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processoId }),
    });
    const json = await res.json().catch(() => ({}));
    setAplicando(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Erro", description: json.error ?? "Tente novamente." });
      return;
    }
    toast({ title: "Soma aplicada à multa do processo" });
    router.refresh();
  }

  async function adicionar() {
    if (!novoGestorId || !novoCargo.trim()) {
      toast({
        variant: "destructive",
        title: "Preencha os campos",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tce/interessados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processoId,
          gestorId: novoGestorId,
          cargo: novoCargo.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao adicionar interessado",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      setNovoGestorId("");
      setNovoCargo("");
      toast({ title: "Interessado adicionado" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remover(id: string) {
    if (!window.confirm("Remover este interessado?")) return;
    const res = await fetch(`/api/tce/interessados/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Erro ao remover" });
      return;
    }
    toast({ title: "Interessado removido" });
    router.refresh();
  }

  return (
    <>
      <div className="space-y-2">
        {interessados.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum interessado vinculado.
          </p>
        ) : (
          <ul className="space-y-2">
            {interessados.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/app/tce/interessados/${i.gestor.id}`}
                    className="font-medium text-brand-navy hover:underline"
                  >
                    {i.gestor.nome}
                  </Link>
                  {i.ehCliente && (
                    <span className="ml-2 rounded bg-brand-navy px-1.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-white">
                      Cliente
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground">{i.cargo}</p>
                  {(i.resultadoIndividual || i.valorMulta !== null || i.valorDevolucao !== null) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[
                        i.resultadoIndividual && (
                          <span key="r" className="font-medium text-brand-tinta">{i.resultadoIndividual}</span>
                        ),
                        i.valorMulta !== null && (
                          <span key="m">Multa <span className="font-mono text-brand-tinta">{brl(i.valorMulta)}</span></span>
                        ),
                        i.valorDevolucao !== null && (
                          <span key="d">Devolução <span className="font-mono text-brand-tinta">{brl(i.valorDevolucao)}</span></span>
                        ),
                      ]
                        .filter(Boolean)
                        .flatMap((el, k) => (k ? [" · ", el] : [el]))}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-brand-navy"
                    onClick={() => setEditando(i)}
                    aria-label={`Editar ${i.gestor.nome}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:bg-red-50 hover:text-red-700"
                    onClick={() => remover(i.id)}
                    aria-label={`Remover ${i.gestor.nome}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {(somaMulta !== null || somaDevolucao !== null) && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
            <span>
              Soma individual:
              {somaMulta !== null && (
                <> multa <span className="font-mono text-brand-tinta">{brl(somaMulta)}</span></>
              )}
              {somaDevolucao !== null && (
                <>
                  {somaMulta !== null ? " ·" : ""} devolução{" "}
                  <span className="font-mono text-brand-tinta">{brl(somaDevolucao)}</span>
                </>
              )}
              {somaDifere ? (
                <>
                  {" "}— no processo: multa{" "}
                  <span className="font-mono">{valorMultaProcesso !== null ? brl(valorMultaProcesso) : "vazia"}</span>
                  {somaDevolucao !== null && (
                    <>
                      , devolução{" "}
                      <span className="font-mono">{valorDevolucaoProcesso !== null ? brl(valorDevolucaoProcesso) : "vazia"}</span>
                    </>
                  )}
                </>
              ) : (
                <> — igual à do processo</>
              )}
            </span>
            {somaDifere && (
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={aplicarSoma} disabled={aplicando}>
                {aplicando ? "Aplicando..." : "Usar a soma no processo"}
              </Button>
            )}
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Adicionar interessado
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar interessado</DialogTitle>
            <DialogDescription>
              Vincule um gestor como interessado neste processo com o cargo
              relevante.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Gestor</Label>
              <Select value={novoGestorId} onValueChange={setNovoGestorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gestor" />
                </SelectTrigger>
                <SelectContent>
                  {gestores.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      [{g.tipoInteressado === "PESSOA_JURIDICA" ? "PJ" : "PF"}]{" "}
                      {g.nome}
                      {g.nomeFantasia ? ` (${g.nomeFantasia})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cargo no processo</Label>
              <Input
                value={novoCargo}
                onChange={(e) => setNovoCargo(e.target.value)}
                placeholder="Ex.: Prefeito, Ordenador de despesas..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={adicionar}
              disabled={saving}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              {saving ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editando && (
        <DialogJulgamentoIndividual
          key={editando.id}
          item={editando}
          resultados={resultados}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  );
}

// Cargo, resultado individual, multa, devolucao e marca de cliente de um interessado.
function DialogJulgamentoIndividual({
  item,
  resultados,
  onClose,
}: {
  item: InteressadoItem;
  resultados: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [cargo, setCargo] = React.useState(item.cargo);
  const [resultado, setResultado] = React.useState(item.resultadoIndividual ?? "");
  const [multa, setMulta] = React.useState(paraTexto(item.valorMulta));
  const [devolucao, setDevolucao] = React.useState(paraTexto(item.valorDevolucao));
  const [cliente, setCliente] = React.useState(item.ehCliente);
  const [saving, setSaving] = React.useState(false);
  const SEM = "__sem__";

  async function salvar() {
    const vm = lerValor(multa);
    const vd = lerValor(devolucao);
    if (!cargo.trim()) {
      toast({ variant: "destructive", title: "Informe o cargo" });
      return;
    }
    if (vm === "erro" || vd === "erro") {
      toast({ variant: "destructive", title: "Valor inválido", description: "Use o formato 13.719,75." });
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/tce/interessados/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cargo: cargo.trim(),
        resultadoIndividual: resultado || null,
        valorMulta: vm,
        valorDevolucao: vd,
        ehCliente: cliente,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: json.error ?? "Tente novamente." });
      return;
    }
    toast({ title: "Interessado atualizado" });
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.gestor.nome}</DialogTitle>
          <DialogDescription>
            Resultado e valores aplicados a esta pessoa no acórdão. Deixe em branco o que não se aplica.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ji-cargo">Cargo no processo</Label>
            <Input id="ji-cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Resultado individual</Label>
            <Select value={resultado || SEM} onValueChange={(v) => setResultado(v === SEM ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sem resultado individual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM}>Sem resultado individual</SelectItem>
                {resultados.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ji-multa">Multa (R$)</Label>
              <Input id="ji-multa" inputMode="decimal" className="font-mono" value={multa} onChange={(e) => setMulta(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ji-devolucao">Devolução (R$)</Label>
              <Input id="ji-devolucao" inputMode="decimal" className="font-mono" value={devolucao} onChange={(e) => setDevolucao(e.target.value)} placeholder="0,00" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={cliente} onChange={(e) => setCliente(e.target.checked)} />
            Cliente do escritório neste processo
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={saving} className="bg-brand-navy hover:bg-brand-navy/90">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
