"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  FileSearch,
  FileText,
  Info,
  Newspaper,
  RefreshCw,
} from "lucide-react";

import {
  AlertaMonitoramentoDialog,
  type AlertaMonitoramentoDetalhe,
} from "@/components/alerta-monitoramento-dialog";
import {
  PublicacaoDjenDialog,
  type PublicacaoDjenDetalhe,
} from "@/components/publicacao-djen-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type MovimentacaoAutoItem = {
  id: string;
  data: string;
  nome: string;
  complementos: string | null;
  lida: boolean;
  ehDecisao: boolean;
  fonte: string;
  codigoMovimento: string | null;
  descricao: string | null;
  conteudoIntegral: string | null;
  conteudoIntegralStatus: string | null;
  djenLinkOficial: string | null;
};

export type PublicacaoDjenItem = {
  id: string;
  data: string;
  conteudo: string | null;
  caderno: string | null;
  pagina: string | null;
  lida: boolean;
  geraIntimacao: boolean;
  fonte: string;
  dataDisponibilizacao: string | null;
};

type Props = {
  processoId: string;
  numeroProcesso: string;
  tribunal: string;
  ativo: boolean;
  ultimaVerificacao: string | null;
  ultimoErro: string | null;
  movimentacoes: MovimentacaoAutoItem[];
  publicacoes: PublicacaoDjenItem[];
  onCriarAndamento: (params: { data: string; texto: string }) => void;
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function isoToInputDate(iso: string): string {
  return iso.slice(0, 10);
}

export function MonitoramentoSection({
  processoId,
  numeroProcesso,
  tribunal,
  ativo,
  ultimaVerificacao,
  ultimoErro,
  movimentacoes,
  publicacoes,
  onCriarAndamento,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [verificando, setVerificando] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);
  const [detalhe, setDetalhe] =
    React.useState<AlertaMonitoramentoDetalhe | null>(null);
  const [pubDjen, setPubDjen] = React.useState<PublicacaoDjenDetalhe | null>(
    null,
  );
  const [buscandoMovIds, setBuscandoMovIds] = React.useState<Set<string>>(
    () => new Set(),
  );

  const ehTrabalhista = numeroProcesso.replace(/\D+/g, "").charAt(13) === "5";

  function abrirPubDjen(m: MovimentacaoAutoItem) {
    if (!m.conteudoIntegral) return;
    setPubDjen({
      numeroProcesso,
      tribunal,
      dataPublicacao: m.data,
      conteudo: m.conteudoIntegral,
      linkOficial: m.djenLinkOficial,
      tipoPublicacao: m.nome,
    });
  }

  async function buscarDjen(movId: string) {
    setBuscandoMovIds((s) => new Set(s).add(movId));
    try {
      const res = await fetch(
        `/api/processos/${processoId}/movimentacoes/${movId}/buscar-djen`,
        { method: "POST" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        encontrado?: boolean;
        status?: string;
        error?: string;
        mensagem?: string;
      };
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao agendar busca",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      if (json.status === "DISPONIVEL") {
        toast({ title: "Texto integral ja disponivel" });
      } else {
        toast({
          title: "Adicionado a fila",
          description:
            json.mensagem ??
            "Aperte 'Verificar agora' para processar a fila imediatamente.",
        });
      }
      router.refresh();
    } finally {
      setBuscandoMovIds((s) => {
        const ns = new Set(s);
        ns.delete(movId);
        return ns;
      });
    }
  }

  function abrirMov(m: MovimentacaoAutoItem) {
    setDetalhe({
      tipo: "movimentacao",
      data: m.data,
      fonte: m.fonte,
      codigoMovimento: m.codigoMovimento,
      nomeMovimento: m.nome,
      descricao: m.descricao,
      complementos: m.complementos,
      ehDecisao: m.ehDecisao,
    });
  }

  function abrirPub(p: PublicacaoDjenItem) {
    setDetalhe({
      tipo: "publicacao",
      data: p.data,
      dataDisponibilizacao: p.dataDisponibilizacao,
      fonte: p.fonte,
      conteudo: p.conteudo,
      caderno: p.caderno,
      pagina: p.pagina,
      geraIntimacao: p.geraIntimacao,
    });
  }

  async function handleToggle(novo: boolean) {
    setToggling(true);
    try {
      const res = await fetch("/api/monitoramento/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processoId, ativo: novo }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: json.error ?? "Nao foi possivel atualizar.",
        });
        return;
      }
      toast({
        title: novo ? "Monitoramento ativado" : "Monitoramento desativado",
      });
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function handleVerificar() {
    setVerificando(true);
    try {
      const res = await fetch("/api/monitoramento/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processoId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao verificar",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({
        title: "Verificacao concluida",
        description: `${json.novasMovimentacoes} mov. + ${json.novasPublicacoes} pub. novas.`,
      });
      router.refresh();
    } finally {
      setVerificando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-brand-navy" />
              Monitoramento Automatico
            </CardTitle>
            <CardDescription>
              Datajud e DJEN — acompanhamento automatico das movimentacoes
              deste processo.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">Monitorar este processo</span>
            <Switch
              checked={ativo}
              onCheckedChange={handleToggle}
              disabled={toggling}
              ariaLabel="Ativar monitoramento"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {ativo ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ultima verificacao
                </p>
                <p className="mt-0.5 text-sm text-slate-800">
                  {formatDateTime(ultimaVerificacao)}
                </p>
                {ultimoErro && (
                  <p className="mt-0.5 text-[11px] text-red-600">
                    erro: {ultimoErro}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleVerificar}
                disabled={verificando}
              >
                <RefreshCw
                  className={cn(
                    "mr-1.5 h-4 w-4",
                    verificando && "animate-spin",
                  )}
                />
                {verificando ? "Verificando..." : "Verificar agora"}
              </Button>
            </div>

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
                <FileText className="h-4 w-4 text-blue-600" />
                Ultimas movimentacoes (Datajud)
              </h3>
              {movimentacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma movimentacao detectada ainda.
                </p>
              ) : (
                <ul className="space-y-2">
                  {movimentacoes.map((m) => (
                    <li
                      key={m.id}
                      className={cn(
                        "flex flex-wrap items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm",
                        !m.lida && "border-blue-200 bg-blue-50/40",
                      )}
                    >
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDateTime(m.data)}</span>
                          {!m.lida && (
                            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                              Novo
                            </span>
                          )}
                          {m.ehDecisao && (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              Decisao detectada — verificar necessidade de recurso
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => abrirMov(m)}
                          className="text-left text-sm text-slate-800 hover:text-brand-navy hover:underline"
                        >
                          {m.nome}
                        </button>
                        {m.complementos && (
                          <p className="text-xs text-muted-foreground">
                            {m.complementos}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {m.conteudoIntegralStatus === "DISPONIVEL" &&
                          m.conteudoIntegral ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] text-emerald-700 hover:bg-emerald-50"
                              onClick={() => abrirPubDjen(m)}
                            >
                              <FileText className="mr-1 h-3.5 w-3.5" />
                              Ver publicacao completa
                            </Button>
                          ) : ehTrabalhista ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-muted-foreground">
                              <Info className="h-3 w-3" />
                              DJEN nao suportado (Just. do Trabalho)
                            </span>
                          ) : m.conteudoIntegralStatus === "PENDENTE" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800">
                              <FileSearch className="h-3 w-3 animate-pulse" />
                              Na fila — aperte &quot;Verificar agora&quot; para
                              processar
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px]"
                              disabled={buscandoMovIds.has(m.id)}
                              onClick={() => buscarDjen(m.id)}
                              title="Adiciona a fila. O texto sera buscado na proxima sincronizacao (cron diario ou clique em 'Verificar agora')."
                            >
                              <FileSearch
                                className={cn(
                                  "mr-1 h-3.5 w-3.5",
                                  buscandoMovIds.has(m.id) && "animate-pulse",
                                )}
                              />
                              {buscandoMovIds.has(m.id)
                                ? "Agendando..."
                                : "Buscar texto integral no DJEN"}
                            </Button>
                          )}
                          {m.conteudoIntegralStatus === "INDISPONIVEL" && (
                            <span className="text-[10px] text-muted-foreground">
                              Texto nao disponivel no DJEN
                            </span>
                          )}
                          {m.conteudoIntegralStatus === "ERRO_BUSCA" && (
                            <span className="text-[10px] text-amber-700">
                              Sera retentado na proxima sincronizacao
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onCriarAndamento({
                            data: isoToInputDate(m.data),
                            texto: [m.nome, m.complementos]
                              .filter(Boolean)
                              .join(" — "),
                          })
                        }
                      >
                        Criar andamento
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
                <Newspaper className="h-4 w-4 text-orange-600" />
                Ultimas publicacoes (DJEN)
              </h3>
              {publicacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma publicacao detectada ainda.
                </p>
              ) : (
                <ul className="space-y-2">
                  {publicacoes.map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        "flex flex-wrap items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm",
                        !p.lida && "border-orange-200 bg-orange-50/40",
                      )}
                    >
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDateTime(p.data)}</span>
                          {!p.lida && (
                            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                              Novo
                            </span>
                          )}
                          {p.geraIntimacao && (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              Intimacao detectada — pode gerar prazo
                            </span>
                          )}
                          {p.caderno && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {p.caderno}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => abrirPub(p)}
                          className="text-left text-sm text-slate-800 hover:text-brand-navy hover:underline"
                        >
                          {p.conteudo ?? "Publicacao DJEN"}
                        </button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onCriarAndamento({
                            data: isoToInputDate(p.data),
                            texto: p.conteudo ?? "Publicacao DJEN",
                          })
                        }
                      >
                        Criar andamento
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ative o monitoramento para acompanhar automaticamente novas
            movimentacoes do Datajud e publicacoes do DJEN para este processo.
          </p>
        )}
      </CardContent>

      <AlertaMonitoramentoDialog
        detalhe={detalhe}
        onOpenChange={(o) => {
          if (!o) setDetalhe(null);
        }}
      />

      <PublicacaoDjenDialog
        detalhe={pubDjen}
        onOpenChange={(o) => {
          if (!o) setPubDjen(null);
        }}
      />
    </Card>
  );
}
