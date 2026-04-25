"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Grau, Risco, TipoProcesso, Tribunal } from "@prisma/client";
import Link from "next/link";
import {
  CalendarDays,
  CalendarRange,
  ChevronRight,
  CircleAlert,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DocumentosSection,
  type DocumentoItem,
} from "@/components/documentos/documentos-section";
import {
  GrauBadge,
  RiscoBadge,
  TipoBadge,
  TribunalBadge,
} from "@/components/processo-badges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditPrazosDialog } from "@/components/prazos/edit-prazos-dialog";
import { PrazoForm, type PrazoInitial } from "@/components/prazos/prazo-form";
import { useToast } from "@/hooks/use-toast";
import { TIPOS_DOCUMENTO_JUDICIAL } from "@/lib/documento-config";
import { diasAte } from "@/lib/prazos";
import { faseLabel } from "@/lib/processo-labels";
import { cn } from "@/lib/utils";

import { AndamentoForm } from "./andamento-form";
import {
  MonitoramentoSection,
  type MovimentacaoAutoItem,
  type PublicacaoDjenItem,
} from "./monitoramento-section";
import {
  ProcessoForm,
  type AdvogadoOption,
  type GestorOption,
  type ProcessoFormInitial,
} from "../processo-form";

type Andamento = {
  id: string;
  data: string;
  grau: Grau;
  fase: string;
  resultado: string | null;
  texto: string;
  autor: { nome: string };
};

type Prazo = {
  id: string;
  tipo: string;
  data: string;
  hora: string | null;
  observacoes: string | null;
  cumprido: boolean;
  geradoAuto: boolean;
  origemFase: string | null;
  advogadoResp: { id: string; nome: string } | null;
};

type HistoricoPautaItem = {
  id: string;
  data: string;
  tribunal: string;
  orgaoJulgador: string;
  tipoSessao: string;
  relator: string;
  situacao: string | null;
  retiradoDePauta: boolean;
  pedidoVistas: boolean;
};

export type ProcessoDetail = {
  id: string;
  numero: string;
  tipo: TipoProcesso;
  tipoLivre: string | null;
  tribunal: Tribunal;
  juizo: string;
  grau: Grau;
  fase: string;
  resultado: string | null;
  risco: Risco;
  valor: number | null;
  dataDistribuicao: string;
  objeto: string;
  gestorId: string;
  advogadoId: string;
  createdAt: string;
  updatedAt: string;
  gestor: { id: string; nome: string; cargo: string; observacoes: string | null };
  advogado: { id: string; nome: string; email: string };
  andamentos: Andamento[];
  prazos: Prazo[];
  historicoPauta: HistoricoPautaItem[];
  documentos: DocumentoItem[];
  monitoramento: {
    ativo: boolean;
    ultimaVerificacao: string | null;
    ultimoErro: string | null;
    movimentacoes: MovimentacaoAutoItem[];
    publicacoes: PublicacaoDjenItem[];
  };
};

type Props = {
  processo: ProcessoDetail;
  gestores: GestorOption[];
  advogados: AdvogadoOption[];
  advogadosResponsaveis: { id: string; nome: string }[];
  canDeleteDocumentos: boolean;
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(d));
}

function formatCurrency(v: number | null): string {
  if (v === null || v === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

export function ProcessoView({
  processo,
  gestores,
  advogados,
  advogadosResponsaveis,
  canDeleteDocumentos,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [addPrazoOpen, setAddPrazoOpen] = React.useState(false);
  const [editPrazosOpen, setEditPrazosOpen] = React.useState(false);
  const [andamentoPrefill, setAndamentoPrefill] = React.useState<{
    data?: string;
    texto?: string;
  } | null>(null);
  const [andamentoPrefillTrigger, setAndamentoPrefillTrigger] = React.useState(0);

  const prazosOrdenados = React.useMemo(() => {
    return [...processo.prazos].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
    );
  }, [processo.prazos]);

  const prazosParaEdicao: PrazoInitial[] = React.useMemo(
    () =>
      prazosOrdenados.map((p) => ({
        id: p.id,
        tipo: p.tipo,
        data: p.data,
        hora: p.hora,
        observacoes: p.observacoes,
        advogadoResp: p.advogadoResp,
      })),
    [prazosOrdenados],
  );

  const initial: ProcessoFormInitial = {
    numero: processo.numero,
    tipo: processo.tipo,
    tipoLivre: processo.tipoLivre ?? "",
    tribunal: processo.tribunal,
    juizo: processo.juizo,
    grau: processo.grau,
    fase: processo.fase,
    resultado: processo.resultado ?? "",
    risco: processo.risco,
    valor: processo.valor,
    dataDistribuicao: processo.dataDistribuicao,
    objeto: processo.objeto,
    gestorId: processo.gestorId,
    advogadoId: processo.advogadoId,
  };

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/processos/${processo.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Erro ao excluir",
          description: json.error ?? "Nao foi possivel excluir o processo.",
        });
        return;
      }
      toast({ title: "Processo excluido" });
      router.push("/app/processos");
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editar processo</CardTitle>
          <CardDescription>Atualize os dados e salve.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProcessoForm
            mode="edit"
            processoId={processo.id}
            initial={initial}
            gestores={gestores}
            advogados={advogados}
            onCancel={() => setEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{processo.numero}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-brand-navy md:text-3xl">
            {processo.gestor.observacoes ?? processo.gestor.nome}
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestor responsavel: {processo.gestor.nome} ({processo.gestor.cargo})
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <TipoBadge tipo={processo.tipo} tipoLivre={processo.tipoLivre} />
            <TribunalBadge tribunal={processo.tribunal} />
            <GrauBadge grau={processo.grau} />
            <RiscoBadge risco={processo.risco} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Situacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Fase atual" value={faseLabel(processo.fase)} />
            <Info label="Resultado" value={processo.resultado ?? "-"} />
            <Info label="Juizo" value={processo.juizo} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Distribuicao" value={formatDate(processo.dataDistribuicao)} />
            <Info label="Criado em" value={formatDate(processo.createdAt)} />
            <Info label="Atualizado em" value={formatDate(processo.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Valor envolvido" value={formatCurrency(processo.valor)} />
            <Info label="Advogado responsavel" value={processo.advogado.nome} />
            <Info label="Contato" value={processo.advogado.email} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Objeto</CardTitle>
          <CardDescription>Descricao do objeto da acao.</CardDescription>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {processo.objeto}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo andamento</CardTitle>
          <CardDescription>
            Registre uma movimentacao e, se houver, gere prazos automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AndamentoForm
            processoId={processo.id}
            currentGrau={processo.grau}
            currentFase={processo.fase}
            prefill={andamentoPrefill}
            prefillTrigger={andamentoPrefillTrigger}
          />
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Andamentos</CardTitle>
            <CardDescription>
              {processo.andamentos.length} registro
              {processo.andamentos.length === 1 ? "" : "s"} — mais recente primeiro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processo.andamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem andamentos registrados.</p>
            ) : (
              <ol className="relative space-y-6 border-l border-slate-200 pl-6">
                {processo.andamentos.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[29px] top-1 flex h-3 w-3 items-center justify-center">
                      <span className="h-3 w-3 rounded-full border-2 border-brand-navy bg-white" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{formatDate(a.data)}</span>
                      <span aria-hidden="true">•</span>
                      <span className="font-medium text-brand-navy">{faseLabel(a.fase)}</span>
                      {a.resultado && (
                        <>
                          <ChevronRight className="h-3 w-3" aria-hidden="true" />
                          <span>{a.resultado}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{a.texto}</p>
                    <p className="mt-1 text-xs text-muted-foreground">por {a.autor.nome}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Prazos</CardTitle>
                <CardDescription>
                  {processo.prazos.length} prazo
                  {processo.prazos.length === 1 ? "" : "s"} vinculado
                  {processo.prazos.length === 1 ? "" : "s"} a este processo.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-brand-navy hover:bg-brand-navy/90"
                  onClick={() => setAddPrazoOpen(true)}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar Prazo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditPrazosOpen(true)}
                  disabled={processo.prazos.length === 0}
                >
                  <ListChecks className="mr-1.5 h-4 w-4" />
                  Editar Prazos
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {prazosOrdenados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem prazos cadastrados.</p>
            ) : (
              <ul className="space-y-2">
                {prazosOrdenados.map((p) => (
                  <PrazoLineItem key={p.id} prazo={p} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <DocumentosSection
        escopo="judicial"
        processoId={processo.id}
        documentos={processo.documentos}
        tiposDocumento={TIPOS_DOCUMENTO_JUDICIAL}
        canDelete={canDeleteDocumentos}
      />

      <MonitoramentoSection
        processoId={processo.id}
        ativo={processo.monitoramento.ativo}
        ultimaVerificacao={processo.monitoramento.ultimaVerificacao}
        ultimoErro={processo.monitoramento.ultimoErro}
        movimentacoes={processo.monitoramento.movimentacoes}
        publicacoes={processo.monitoramento.publicacoes}
        onCriarAndamento={(p) => {
          setAndamentoPrefill(p);
          setAndamentoPrefillTrigger((n) => n + 1);
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarRange className="h-4 w-4 text-brand-navy" />
                Historico de Pauta
              </CardTitle>
              <CardDescription>
                {processo.historicoPauta.length === 0
                  ? "Este processo nunca foi pautado."
                  : `${processo.historicoPauta.length} sessao${processo.historicoPauta.length === 1 ? "" : "oes"} em que este processo foi pautado.`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {processo.historicoPauta.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Vincule um item de pauta a este processo para acompanhar o historico.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Tribunal</th>
                    <th className="px-3 py-2">Orgao julgador</th>
                    <th className="px-3 py-2">Relator</th>
                    <th className="px-3 py-2">Situacao</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processo.historicoPauta.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b align-top hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 text-xs text-slate-700">
                        <Link
                          href={`/app/pautas?semana=${h.data.slice(0, 10)}`}
                          className="font-medium text-brand-navy hover:underline"
                        >
                          {formatDate(h.data)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {h.tribunal}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {h.orgaoJulgador}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {h.relator}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {h.situacao ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          {h.retiradoDePauta && (
                            <span className="inline-flex w-fit rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                              Retirado
                            </span>
                          )}
                          {h.pedidoVistas && (
                            <span className="inline-flex w-fit rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800">
                              Pedido de vistas
                            </span>
                          )}
                          {!h.retiradoDePauta && !h.pedidoVistas && (
                            <span className="text-[10px] text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addPrazoOpen} onOpenChange={setAddPrazoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar prazo</DialogTitle>
            <DialogDescription>
              Cadastre um novo prazo para este processo.
            </DialogDescription>
          </DialogHeader>
          <PrazoForm
            mode="create"
            processoId={processo.id}
            advogados={advogadosResponsaveis}
            onSuccess={() => {
              setAddPrazoOpen(false);
              router.refresh();
            }}
            onCancel={() => setAddPrazoOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <EditPrazosDialog
        open={editPrazosOpen}
        onOpenChange={setEditPrazosOpen}
        prazos={prazosParaEdicao}
        advogados={advogadosResponsaveis}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir processo?</DialogTitle>
            <DialogDescription>
              Esta acao e irreversivel. Todos os andamentos, prazos e documentos vinculados serao removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Confirmar exclusao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-slate-800">{value}</p>
    </div>
  );
}

function PrazoLineItem({ prazo }: { prazo: Prazo }) {
  const dias = diasAte(new Date(prazo.data));
  const badgeClass = prazo.cumprido
    ? "bg-emerald-100 text-emerald-800"
    : dias <= 7
      ? "bg-red-100 text-red-800"
      : dias <= 15
        ? "bg-yellow-100 text-yellow-800"
        : "bg-slate-100 text-slate-700";

  const badgeLabel = prazo.cumprido
    ? "cumprido"
    : dias < 0
      ? `atrasado ${-dias}d`
      : dias === 0
        ? "vence hoje"
        : `${dias}d restantes`;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm",
        prazo.cumprido && "opacity-70",
      )}
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "font-medium text-brand-navy",
              prazo.cumprido && "line-through text-muted-foreground",
            )}
          >
            {prazo.tipo}
          </span>
          {prazo.advogadoResp && (
            <span className="inline-flex items-center rounded-full bg-brand-navy/10 px-2 py-0.5 text-[11px] font-semibold text-brand-navy">
              {prazo.advogadoResp.nome}
            </span>
          )}
          {prazo.geradoAuto && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
              auto
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{formatDate(prazo.data)}</span>
          {prazo.hora && <span>as {prazo.hora}</span>}
        </div>
        {prazo.observacoes && (
          <p className="mt-1 text-xs text-slate-600">{prazo.observacoes}</p>
        )}
        {prazo.geradoAuto && prazo.origemFase && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <CircleAlert className="h-3 w-3" />
            Gerado a partir da fase {prazo.origemFase}.
          </p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
          badgeClass,
        )}
      >
        {badgeLabel}
      </span>
    </li>
  );
}
