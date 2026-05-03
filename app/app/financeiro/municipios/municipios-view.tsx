"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { BancaBadgeList } from "@/components/bancas/banca-badge";
import { BancaFilter } from "@/components/bancas/banca-filter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ANOS_DISPONIVEIS,
  computeStatusNota,
  diasEmAtraso,
  formatBRL,
  NOMES_MESES,
  STATUS_NOTA,
  statusBgClass,
  statusRenovacao,
  type StatusNotaT,
} from "@/lib/financeiro";
import { cn } from "@/lib/utils";

import {
  CadastrarContratoDialog,
  type ContratoParaEditar,
} from "./cadastrar-contrato-dialog";
import { EditarNotaDialog, type NotaParaEditar } from "./editar-nota-dialog";
import { EmitirAditivoDialog } from "./emitir-aditivo-dialog";
import { RenovarContratoDialog } from "./renovar-contrato-dialog";

export type NotaCard = {
  id: string;
  mesReferencia: number;
  anoReferencia: number;
  valorNota: number;
  valorPago: number | null;
  dataVencimento: string;
  dataEmissao: string | null;
  dataPagamento: string | null;
  numeroNota: string | null;
  pago: boolean;
  observacoes: string | null;
  arquivoUrl: string | null;
  arquivoNome: string | null;
  arquivoTipo: string | null;
};

export type ContratoCard = {
  id: string;
  municipio: { id: string; nome: string; uf: string } | null;
  bancasSlug: string[];
  valorMensal: number;
  dataInicio: string;
  dataFim: string | null;
  ativo: boolean;
  observacoes: string | null;
  dataRenovacao: string | null;
  diasAvisoRenovacao: number;
  observacoesRenovacao: string | null;
  numeroContrato: string | null;
  cnpjContratante: string | null;
  orgaoContratante: string | null;
  representanteContratante: string | null;
  cargoRepresentante: string | null;
  objetoDoContrato: string | null;
  notas: NotaCard[];
};

type MunicipioOpt = { id: string; nome: string; uf: string };

type Props = {
  ano: number;
  cards: ContratoCard[];
  municipios: MunicipioOpt[];
  isAdmin?: boolean;
  bancaUsuario?: string | null;
};

export function MunicipiosFinanceiroView({
  ano,
  cards,
  municipios,
  isAdmin = false,
  bancaUsuario = null,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [novoContratoOpen, setNovoContratoOpen] = React.useState(false);
  const [editingContrato, setEditingContrato] =
    React.useState<ContratoParaEditar | null>(null);
  const [excluindo, setExcluindo] = React.useState(false);
  const [editingNota, setEditingNota] = React.useState<{
    nota: NotaParaEditar | null;
    contratoId: string;
    mes: number;
    ano: number;
    valorMensal: number;
  } | null>(null);
  const [renovando, setRenovando] = React.useState<{
    contratoId: string;
    municipioNome: string;
    valorMensal: number;
    dataFim: string | null;
  } | null>(null);
  const [aditivando, setAditivando] = React.useState<{
    contratoId: string;
    municipioNome: string;
    bancasSlug: string[];
  } | null>(null);

  function setAno(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ano", v);
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function handleEditarContrato(c: ContratoCard) {
    setEditingContrato({
      id: c.id,
      municipioId: c.municipio?.id ?? null,
      bancasSlug: c.bancasSlug,
      valorMensal: c.valorMensal,
      dataInicio: c.dataInicio,
      dataFim: c.dataFim,
      observacoes: c.observacoes,
      dataRenovacao: c.dataRenovacao,
      diasAvisoRenovacao: c.diasAvisoRenovacao,
      observacoesRenovacao: c.observacoesRenovacao,
      numeroContrato: c.numeroContrato,
      cnpjContratante: c.cnpjContratante,
      orgaoContratante: c.orgaoContratante,
      representanteContratante: c.representanteContratante,
      cargoRepresentante: c.cargoRepresentante,
      objetoDoContrato: c.objetoDoContrato,
    });
  }

  async function handleExcluirContrato(c: ContratoCard) {
    const nome = c.municipio?.nome ?? "este municipio";
    const ok = window.confirm(
      `Tem certeza que deseja excluir o contrato com ${nome}? Todas as notas fiscais vinculadas tambem serao excluidas. Esta acao nao pode ser desfeita.`,
    );
    if (!ok) return;
    setExcluindo(true);
    try {
      const res = await fetch(`/api/financeiro/contratos/${c.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao excluir contrato",
          description: json.error,
        });
        return;
      }
      toast({ title: "Contrato excluido" });
      router.refresh();
    } finally {
      setExcluindo(false);
    }
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Financeiro
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Honorarios Municipais
          </h1>
          <p className="text-sm text-muted-foreground">
            Calendario anual de notas fiscais por contrato municipal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setNovoContratoOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Cadastrar Contrato
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[140px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Ano</label>
            <Select value={String(ano)} onValueChange={setAno}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANOS_DISPONIVEIS.map((a) => (
                  <SelectItem key={a} value={String(a)}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {isAdmin && <BancaFilter />}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border bg-white p-12 text-center text-sm text-muted-foreground shadow-sm">
          <Receipt className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          Nenhum contrato ativo para {ano} no recorte selecionado.
          <br />
          Use &quot;Cadastrar Contrato&quot; para criar.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <ContratoCardView
              key={c.id}
              ano={ano}
              card={c}
              hoje={hoje}
              onClickMes={(mes, nota) =>
                setEditingNota({
                  nota: nota
                    ? {
                        id: nota.id,
                        numeroNota: nota.numeroNota,
                        dataEmissao: nota.dataEmissao,
                        valorNota: nota.valorNota,
                        dataVencimento: nota.dataVencimento,
                        pago: nota.pago,
                        dataPagamento: nota.dataPagamento,
                        valorPago: nota.valorPago,
                        observacoes: nota.observacoes,
                        arquivoUrl: nota.arquivoUrl,
                        arquivoNome: nota.arquivoNome,
                        arquivoTipo: nota.arquivoTipo,
                      }
                    : null,
                  contratoId: c.id,
                  mes,
                  ano,
                  valorMensal: c.valorMensal,
                })
              }
              onRenovar={() =>
                setRenovando({
                  contratoId: c.id,
                  municipioNome: c.municipio?.nome ?? "",
                  valorMensal: c.valorMensal,
                  dataFim: c.dataFim,
                })
              }
              onAditivar={() =>
                setAditivando({
                  contratoId: c.id,
                  municipioNome: c.municipio?.nome ?? "",
                  bancasSlug: c.bancasSlug,
                })
              }
              onEditar={() => handleEditarContrato(c)}
              onExcluir={() => handleExcluirContrato(c)}
              excluindoEmCurso={excluindo}
            />
          ))}
        </div>
      )}

      <CadastrarContratoDialog
        open={novoContratoOpen || !!editingContrato}
        onOpenChange={(o) => {
          if (!o) {
            setNovoContratoOpen(false);
            setEditingContrato(null);
          }
        }}
        municipios={municipios}
        editing={editingContrato}
        bancaFixa={isAdmin ? null : bancaUsuario}
        onSuccess={() => {
          setNovoContratoOpen(false);
          setEditingContrato(null);
          router.refresh();
        }}
      />

      <EditarNotaDialog
        open={!!editingNota}
        onOpenChange={(o) => {
          if (!o) setEditingNota(null);
        }}
        contratoId={editingNota?.contratoId ?? ""}
        mes={editingNota?.mes ?? 1}
        ano={editingNota?.ano ?? ano}
        valorPadrao={editingNota?.valorMensal ?? 0}
        nota={editingNota?.nota ?? null}
        onSuccess={() => {
          setEditingNota(null);
          router.refresh();
        }}
      />

      <RenovarContratoDialog
        open={!!renovando}
        onOpenChange={(o) => {
          if (!o) setRenovando(null);
        }}
        contratoId={renovando?.contratoId ?? ""}
        municipioNome={renovando?.municipioNome ?? ""}
        valorMensalAtual={renovando?.valorMensal ?? 0}
        dataFimAtual={renovando?.dataFim ?? null}
        onSuccess={() => {
          setRenovando(null);
          router.refresh();
        }}
      />

      <EmitirAditivoDialog
        open={!!aditivando}
        onOpenChange={(o) => {
          if (!o) setAditivando(null);
        }}
        contratoId={aditivando?.contratoId ?? ""}
        municipioNome={aditivando?.municipioNome ?? ""}
        bancasContrato={aditivando?.bancasSlug ?? []}
      />
    </>
  );
}

type ContratoCardProps = {
  ano: number;
  card: ContratoCard;
  hoje: Date;
  onClickMes: (mes: number, nota: NotaCard | null) => void;
  onRenovar: () => void;
  onAditivar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  excluindoEmCurso: boolean;
};

function ContratoCardView({
  ano,
  card,
  hoje,
  onClickMes,
  onRenovar,
  onAditivar,
  onEditar,
  onExcluir,
  excluindoEmCurso,
}: ContratoCardProps) {
  const renov = statusRenovacao(
    card.dataRenovacao ? new Date(card.dataRenovacao) : null,
    card.diasAvisoRenovacao,
    card.ativo,
    hoje,
  );
  const notaPorMes = new Map<number, NotaCard>();
  for (const n of card.notas) notaPorMes.set(n.mesReferencia, n);

  let recebido = 0;
  let aberto = 0;
  let atraso = 0;
  for (let m = 1; m <= 12; m++) {
    const n = notaPorMes.get(m);
    if (!n) continue;
    const status = computeStatusNota(
      { pago: n.pago, dataVencimento: new Date(n.dataVencimento) },
      hoje,
    );
    if (status === STATUS_NOTA.PAGA) {
      recebido += n.valorPago ?? n.valorNota;
    } else if (status === STATUS_NOTA.A_VENCER) {
      aberto += n.valorNota;
    } else {
      atraso += n.valorNota;
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-brand-navy">
            {card.municipio?.nome ?? "—"}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {card.municipio ? `${card.municipio.uf} • ` : ""}
            {formatBRL(card.valorMensal)}/mes
            {card.numeroContrato ? ` • Contrato ${card.numeroContrato}` : ""}
          </p>
          {card.objetoDoContrato && (
            <p
              className="mt-1 line-clamp-2 text-[11px] text-slate-600"
              title={card.objetoDoContrato}
            >
              <span className="font-medium text-slate-700">Objeto:</span>{" "}
              {card.objetoDoContrato}
            </p>
          )}
        </div>
        <div className="flex items-start gap-1">
          <BancaBadgeList slugs={card.bancasSlug} size="sm" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-600 hover:bg-slate-100"
            title="Editar contrato"
            onClick={onEditar}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-700 hover:bg-red-50"
            title="Excluir contrato"
            onClick={onExcluir}
            disabled={excluindoEmCurso}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Badges de renovacao */}
      {renov.tipo === "PROXIMA" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-800 ring-1 ring-orange-200">
            Renovacao proxima — {renov.diasAteRenovacao}d
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={onAditivar}
          >
            <FileText className="mr-1 h-3 w-3" />
            Emitir Solicitacao de Aditivo
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={onRenovar}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Renovar
          </Button>
        </div>
      )}
      {renov.tipo === "VENCIDA" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex animate-pulse items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Renovacao vencida — {renov.diasDesdeVencimento}d
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={onAditivar}
          >
            <FileText className="mr-1 h-3 w-3" />
            Emitir Solicitacao de Aditivo
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={onRenovar}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Renovar
          </Button>
        </div>
      )}
      {renov.tipo === "OK" && (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-muted-foreground"
            onClick={onAditivar}
          >
            <FileText className="mr-1 h-3 w-3" />
            Aditivo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-muted-foreground"
            onClick={onRenovar}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Renovar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-6 gap-1.5">
        {NOMES_MESES.map((label, idx) => {
          const mes = idx + 1;
          const nota = notaPorMes.get(mes) ?? null;
          let status: StatusNotaT | "SEM_NOTA" = "SEM_NOTA";
          if (nota) {
            status = computeStatusNota(
              { pago: nota.pago, dataVencimento: new Date(nota.dataVencimento) },
              hoje,
            );
          }
          const dias = nota
            ? diasEmAtraso(new Date(nota.dataVencimento), hoje)
            : 0;
          const title = nota
            ? `${label}/${ano} — ${formatBRL(nota.valorNota)}${
                status === STATUS_NOTA.PAGA
                  ? " (PAGA)"
                  : status === STATUS_NOTA.A_VENCER
                    ? " (a vencer)"
                    : ` (vencida ${dias}d)`
              }`
            : `${label}/${ano} — sem nota`;
          return (
            <button
              key={mes}
              type="button"
              onClick={() => onClickMes(mes, nota)}
              title={title}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 rounded-md py-2 text-[10px] font-semibold transition-colors",
                statusBgClass(status),
              )}
            >
              {nota?.arquivoUrl && (
                <Paperclip
                  className="absolute right-0.5 top-0.5 h-2.5 w-2.5 opacity-80"
                  aria-label="Tem arquivo anexado"
                />
              )}
              <span>{label}</span>
              {nota && status !== STATUS_NOTA.PAGA && (
                <span className="text-[8px] opacity-90">
                  {nota.dataVencimento.slice(8, 10)}/{nota.dataVencimento.slice(5, 7)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t pt-2 text-[11px]">
        <div>
          <p className="text-muted-foreground">Recebido</p>
          <p className="font-semibold text-emerald-700">
            {formatBRL(recebido)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Em aberto</p>
          <p className="font-semibold text-amber-700">{formatBRL(aberto)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Em atraso</p>
          <p className="font-semibold text-red-700">{formatBRL(atraso)}</p>
        </div>
      </div>
    </div>
  );
}
