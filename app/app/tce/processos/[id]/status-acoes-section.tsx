"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Check,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  StickyNote,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { CriarPrazoDialog } from "../../pendencias/criar-prazo-dialog";
import { DespachoFeitoDialog } from "../../pendencias/despacho-feito-dialog";
import { DispensarPendenciaDialog } from "../../pendencias/dispensar-dialog";
import { MemorialProntoDialog } from "../../pendencias/memorial-pronto-dialog";

type DispensaInfo = {
  por: string;
  em: string;
  motivo: string | null;
};

type Advogado = { id: string; nome: string };

type MemorialDoc = {
  id: string;
  nome: string;
  url: string;
  createdAt: string;
  uploadedByNome: string;
};

type Props = {
  processoId: string;
  notaTecnica: boolean;
  parecerMpco: boolean;
  contrarrazoesNtApresentadas: boolean;
  contrarrazoesMpcoApresentadas: boolean;
  contrarrazoesNtDispensado: DispensaInfo | null;
  contrarrazoesMpcoDispensado: DispensaInfo | null;
  memorialPronto: boolean;
  memorialDispensado: DispensaInfo | null;
  despachadoComRelator: boolean;
  despachoDispensado: DispensaInfo | null;
  dataDespacho: string | null;
  retornoDespacho: string | null;
  memorialAgendadoData: string | null;
  memorialAgendadoAdvogadoNome: string | null;
  despachoAgendadoData: string | null;
  despachoAgendadoAdvogadoNome: string | null;
  memorialDoc: MemorialDoc | null;
  advogados: Advogado[];
};

const API = "/api/tce/pendencias";

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function StatusAcoesSection(props: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-brand-navy">
        Status e Acoes
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CardNotaTecnica {...props} />
        <CardParecerMpco {...props} />
        <CardMemorial {...props} />
        <CardDespacho {...props} />
      </div>
    </section>
  );
}

// ============================== HELPERS ==============================

function useAcao() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function call(
    body: Record<string, unknown>,
    msgOk: string,
  ): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: json.error ?? "Tente novamente.",
        });
        return false;
      }
      toast({ title: msgOk });
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  return { busy, call };
}

// ============================== CARD NT ==============================

function CardNotaTecnica(props: Props) {
  const { busy, call } = useAcao();
  const [criarPrazoOpen, setCriarPrazoOpen] = React.useState(false);
  const [dispensarOpen, setDispensarOpen] = React.useState(false);

  const dispensado = props.contrarrazoesNtDispensado;
  const concluido = props.contrarrazoesNtApresentadas;

  const tone = !props.notaTecnica
    ? "neutral"
    : dispensado
      ? "slate"
      : concluido
        ? "green"
        : "amber";

  return (
    <Card id="card-nt" className={cardToneClass(tone)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Nota Tecnica
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!props.notaTecnica && (
          <>
            <StatusLine
              icon={<X className="h-4 w-4 text-red-500" />}
              text="Sem Nota Tecnica"
            />
            <Button
              size="sm"
              className="bg-brand-navy hover:bg-brand-navy/90"
              disabled={busy}
              onClick={() =>
                call(
                  { acao: "registrar_nt", processoId: props.processoId, valor: true },
                  "Nota Tecnica registrada",
                )
              }
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar NT
            </Button>
          </>
        )}

        {props.notaTecnica && !concluido && !dispensado && (
          <>
            <StatusLine
              icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              text="NT juntada — contrarrazoes pendentes"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCriarPrazoOpen(true)}
                disabled={busy}
              >
                Criar Prazo
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setDispensarOpen(true)}
                disabled={busy}
              >
                <Ban className="mr-1 h-3.5 w-3.5" />
                Dispensar
              </Button>
              <Button
                size="sm"
                className="bg-brand-navy hover:bg-brand-navy/90"
                disabled={busy}
                onClick={() =>
                  call(
                    {
                      acao: "contrarrazoes_nt",
                      processoId: props.processoId,
                    },
                    "Contrarrazoes a NT registradas",
                  )
                }
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Concluir
              </Button>
            </div>
          </>
        )}

        {concluido && !dispensado && (
          <StatusLine
            icon={<Check className="h-4 w-4 text-emerald-600" />}
            text="Contrarrazoes a NT apresentadas"
          />
        )}

        {dispensado && (
          <DispensaInfoBlock
            info={dispensado}
            label="Contrarrazoes NT dispensadas"
            disabled={busy}
            onReverter={() =>
              call(
                {
                  acao: "reverter_dispensa_contrarrazoes_nt",
                  processoId: props.processoId,
                },
                "Dispensa revertida",
              )
            }
          />
        )}

        <CriarPrazoDialog
          open={criarPrazoOpen}
          onOpenChange={setCriarPrazoOpen}
          processoId={props.processoId}
          tipoPrazo="Contrarrazoes a Nota Tecnica"
          advogados={props.advogados}
          onCreated={() => setCriarPrazoOpen(false)}
        />

        <DispensarPendenciaDialog
          open={dispensarOpen}
          onOpenChange={setDispensarOpen}
          modo="contrarrazoes_nt"
          processoId={props.processoId}
          advogados={props.advogados}
          apiPath={API}
        />
      </CardContent>
    </Card>
  );
}

// ============================== CARD MPCO ==============================

function CardParecerMpco(props: Props) {
  const { busy, call } = useAcao();
  const [criarPrazoOpen, setCriarPrazoOpen] = React.useState(false);
  const [dispensarOpen, setDispensarOpen] = React.useState(false);

  const dispensado = props.contrarrazoesMpcoDispensado;
  const concluido = props.contrarrazoesMpcoApresentadas;

  const tone = !props.parecerMpco
    ? "neutral"
    : dispensado
      ? "slate"
      : concluido
        ? "green"
        : "amber";

  return (
    <Card id="card-mpco" className={cardToneClass(tone)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Parecer MPCO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!props.parecerMpco && (
          <>
            <StatusLine
              icon={<X className="h-4 w-4 text-red-500" />}
              text="Sem Parecer MPCO"
            />
            <Button
              size="sm"
              className="bg-brand-navy hover:bg-brand-navy/90"
              disabled={busy}
              onClick={() =>
                call(
                  { acao: "registrar_mpco", processoId: props.processoId, valor: true },
                  "Parecer MPCO registrado",
                )
              }
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Parecer MPCO
            </Button>
          </>
        )}

        {props.parecerMpco && !concluido && !dispensado && (
          <>
            <StatusLine
              icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              text="Parecer MPCO juntado — contrarrazoes pendentes"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCriarPrazoOpen(true)}
                disabled={busy}
              >
                Criar Prazo
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setDispensarOpen(true)}
                disabled={busy}
              >
                <Ban className="mr-1 h-3.5 w-3.5" />
                Dispensar
              </Button>
              <Button
                size="sm"
                className="bg-brand-navy hover:bg-brand-navy/90"
                disabled={busy}
                onClick={() =>
                  call(
                    {
                      acao: "contrarrazoes_mpco",
                      processoId: props.processoId,
                    },
                    "Contrarrazoes ao MPCO registradas",
                  )
                }
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Concluir
              </Button>
            </div>
          </>
        )}

        {concluido && !dispensado && (
          <StatusLine
            icon={<Check className="h-4 w-4 text-emerald-600" />}
            text="Contrarrazoes ao MPCO apresentadas"
          />
        )}

        {dispensado && (
          <DispensaInfoBlock
            info={dispensado}
            label="Contrarrazoes MPCO dispensadas"
            disabled={busy}
            onReverter={() =>
              call(
                {
                  acao: "reverter_dispensa_contrarrazoes_mpco",
                  processoId: props.processoId,
                },
                "Dispensa revertida",
              )
            }
          />
        )}

        <CriarPrazoDialog
          open={criarPrazoOpen}
          onOpenChange={setCriarPrazoOpen}
          processoId={props.processoId}
          tipoPrazo="Contrarrazoes ao Parecer MPCO"
          advogados={props.advogados}
          onCreated={() => setCriarPrazoOpen(false)}
        />

        <DispensarPendenciaDialog
          open={dispensarOpen}
          onOpenChange={setDispensarOpen}
          modo="contrarrazoes_mpco"
          processoId={props.processoId}
          advogados={props.advogados}
          apiPath={API}
        />
      </CardContent>
    </Card>
  );
}

// ============================== CARD MEMORIAL ==============================

function CardMemorial(props: Props) {
  const { busy, call } = useAcao();
  const [criarPrazoOpen, setCriarPrazoOpen] = React.useState(false);
  const [memorialProntoOpen, setMemorialProntoOpen] = React.useState(false);
  const [dispensarOpen, setDispensarOpen] = React.useState(false);

  const dispensado = props.memorialDispensado;
  const pronto = props.memorialPronto;
  const tone = pronto ? "green" : dispensado ? "slate" : "amber";

  return (
    <Card id="card-memorial" className={cardToneClass(tone)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4" />
          Memorial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!pronto && !dispensado && (
          <>
            <StatusLine
              icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              text="Memorial pendente de elaboracao"
            />
            {props.memorialAgendadoData && props.memorialAgendadoAdvogadoNome && (
              <p className="text-xs text-blue-700">
                Agendado para {fmtDate(props.memorialAgendadoData)} com{" "}
                {props.memorialAgendadoAdvogadoNome}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCriarPrazoOpen(true)}
                disabled={busy}
              >
                Criar Prazo
              </Button>
              <Button
                size="sm"
                className="bg-brand-navy hover:bg-brand-navy/90"
                onClick={() => setMemorialProntoOpen(true)}
                disabled={busy}
              >
                <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                Memorial Pronto
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setDispensarOpen(true)}
                disabled={busy}
              >
                <Ban className="mr-1 h-3.5 w-3.5" />
                Dispensar
              </Button>
            </div>
          </>
        )}

        {pronto && (
          <>
            <StatusLine
              icon={<Check className="h-4 w-4 text-emerald-600" />}
              text="Memorial elaborado"
            />
            {props.memorialDoc ? (
              <div className="rounded-md border bg-white px-3 py-2 text-xs">
                <a
                  href={props.memorialDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-brand-navy hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  {props.memorialDoc.nome}
                </a>
                <p className="mt-1 text-muted-foreground">
                  Anexado por {props.memorialDoc.uploadedByNome} em{" "}
                  {fmtDate(props.memorialDoc.createdAt)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sem arquivo anexado.
              </p>
            )}
          </>
        )}

        {dispensado && (
          <DispensaInfoBlock
            info={dispensado}
            label="Memorial dispensado"
            disabled={busy}
            onReverter={() =>
              call(
                {
                  acao: "reverter_dispensa_memorial",
                  processoId: props.processoId,
                },
                "Dispensa revertida",
              )
            }
          />
        )}

        <CriarPrazoDialog
          open={criarPrazoOpen}
          onOpenChange={setCriarPrazoOpen}
          processoId={props.processoId}
          tipoPrazo="Agendar Elaboracao do Memorial"
          advogados={props.advogados}
          onCreated={() => setCriarPrazoOpen(false)}
        />

        <MemorialProntoDialog
          open={memorialProntoOpen}
          onOpenChange={setMemorialProntoOpen}
          processoId={props.processoId}
          escopo="tce"
          pendenciasApiPath={API}
        />

        <DispensarPendenciaDialog
          open={dispensarOpen}
          onOpenChange={setDispensarOpen}
          modo="memorial"
          processoId={props.processoId}
          advogados={props.advogados}
          apiPath={API}
        />
      </CardContent>
    </Card>
  );
}

// ============================== CARD DESPACHO ==============================

function CardDespacho(props: Props) {
  const { busy, call } = useAcao();
  const [criarPrazoOpen, setCriarPrazoOpen] = React.useState(false);
  const [despachoFeitoOpen, setDespachoFeitoOpen] = React.useState(false);
  const [dispensarOpen, setDispensarOpen] = React.useState(false);

  const dispensado = props.despachoDispensado;
  const despachado = props.despachadoComRelator;
  const podeDespachar = props.memorialPronto || !!props.memorialDispensado;

  const tone = despachado
    ? "green"
    : dispensado
      ? "slate"
      : podeDespachar
        ? "amber"
        : "neutral";

  return (
    <Card id="card-despacho" className={cardToneClass(tone)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" />
          Despacho com Relator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!podeDespachar && !despachado && !dispensado && (
          <StatusLine
            icon={<Clock className="h-4 w-4 text-slate-500" />}
            text="Aguardando memorial"
          />
        )}

        {podeDespachar && !despachado && !dispensado && (
          <>
            <StatusLine
              icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              text="Despacho pendente"
            />
            {props.despachoAgendadoData && props.despachoAgendadoAdvogadoNome && (
              <p className="text-xs text-blue-700">
                Agendado para {fmtDate(props.despachoAgendadoData)} com{" "}
                {props.despachoAgendadoAdvogadoNome}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCriarPrazoOpen(true)}
                disabled={busy}
              >
                Criar Prazo
              </Button>
              <Button
                size="sm"
                className="bg-brand-navy hover:bg-brand-navy/90"
                onClick={() => setDespachoFeitoOpen(true)}
                disabled={busy}
              >
                <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                Marcar Despachado
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setDispensarOpen(true)}
                disabled={busy}
              >
                <Ban className="mr-1 h-3.5 w-3.5" />
                Dispensar
              </Button>
            </div>
          </>
        )}

        {despachado && (
          <>
            <StatusLine
              icon={<Check className="h-4 w-4 text-emerald-600" />}
              text={
                props.dataDespacho
                  ? `Despachado em ${fmtDate(props.dataDespacho)}`
                  : "Despachado"
              }
            />
            {props.retornoDespacho && (
              <div className="rounded-md border bg-white px-3 py-2 text-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Retorno do despacho
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">
                  {props.retornoDespacho}
                </p>
              </div>
            )}
          </>
        )}

        {dispensado && (
          <DispensaInfoBlock
            info={dispensado}
            label="Despacho dispensado"
            disabled={busy}
            onReverter={() =>
              call(
                {
                  acao: "reverter_dispensa_despacho",
                  processoId: props.processoId,
                },
                "Dispensa revertida",
              )
            }
          />
        )}

        <CriarPrazoDialog
          open={criarPrazoOpen}
          onOpenChange={setCriarPrazoOpen}
          processoId={props.processoId}
          tipoPrazo="Agendar Marcacao do Despacho"
          advogados={props.advogados}
          onCreated={() => setCriarPrazoOpen(false)}
        />

        <DespachoFeitoDialog
          open={despachoFeitoOpen}
          onOpenChange={setDespachoFeitoOpen}
          processoId={props.processoId}
          pendenciasApiPath={API}
        />

        <DispensarPendenciaDialog
          open={dispensarOpen}
          onOpenChange={setDispensarOpen}
          modo="despacho"
          processoId={props.processoId}
          advogados={props.advogados}
          apiPath={API}
        />
      </CardContent>
    </Card>
  );
}

// ============================== UI HELPERS ==============================

type Tone = "neutral" | "amber" | "green" | "slate";

function cardToneClass(tone: Tone): string {
  return cn(
    "scroll-mt-24 border",
    tone === "amber" && "border-amber-300 bg-amber-50",
    tone === "green" && "border-emerald-300 bg-emerald-50",
    tone === "slate" && "border-slate-300 bg-slate-100",
    tone === "neutral" && "border-slate-200 bg-slate-50",
  );
}

function StatusLine({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
      {icon}
      {text}
    </p>
  );
}

function DispensaInfoBlock({
  info,
  label,
  disabled,
  onReverter,
}: {
  info: DispensaInfo;
  label: string;
  disabled: boolean;
  onReverter: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-start gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
        <Ban className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {label} por {info.por} em {fmtDate(info.em)}
        </span>
      </p>
      {info.motivo && (
        <p className="text-xs text-slate-600">Motivo: {info.motivo}</p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={onReverter}
        disabled={disabled}
      >
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Reverter Dispensa
      </Button>
    </div>
  );
}
