"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  CheckCheck,
  FileText,
  Newspaper,
  RefreshCw,
} from "lucide-react";

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

type Alerta = {
  id: string;
  tipo: "movimentacao" | "publicacao";
  data: string;
  titulo: string;
  detalhe: string | null;
  ehDecisao: boolean;
  geraIntimacao: boolean;
  processo: {
    id: string;
    numero: string;
    tribunal: string;
    gestor: string;
  };
};

type LinhaProcesso = {
  id: string;
  numero: string;
  tribunal: string;
  gestor: string;
  monitoramentoAtivo: boolean;
  ultimaVerificacao: string | null;
  ultimoErro: string | null;
  novosAlertas: number;
};

type Props = {
  totalMonitorados: number;
  ultimaVerificacao: string | null;
  alertas: Alerta[];
  processos: LinhaProcesso[];
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function MonitoramentoClient({
  totalMonitorados,
  ultimaVerificacao,
  alertas,
  processos,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [verificando, setVerificando] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  async function handleVerificar() {
    setVerificando(true);
    try {
      const res = await fetch("/api/monitoramento/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
        description: `${json.processosVerificados} processo(s). ${json.novasMovimentacoes} mov. + ${json.novasPublicacoes} pub. novas.${
          json.erros?.length ? ` ${json.erros.length} erro(s).` : ""
        }`,
      });
      router.refresh();
    } finally {
      setVerificando(false);
    }
  }

  async function handleToggle(processoId: string, ativo: boolean) {
    setTogglingId(processoId);
    try {
      const res = await fetch("/api/monitoramento/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processoId, ativo }),
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
        title: ativo ? "Monitoramento ativado" : "Monitoramento desativado",
      });
      router.refresh();
    } finally {
      setTogglingId(null);
    }
  }

  async function handleMarcarLida(
    tipo: "movimentacao" | "publicacao",
    id: string,
  ) {
    const res = await fetch("/api/monitoramento/marcar-lida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, id }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast({
        variant: "destructive",
        title: "Erro",
        description: json.error ?? "Nao foi possivel marcar como lida.",
      });
      return;
    }
    router.refresh();
  }

  async function handleMarcarTodasLidas() {
    await Promise.all([
      fetch("/api/monitoramento/marcar-lida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "movimentacao", todas: true }),
      }),
      fetch("/api/monitoramento/marcar-lida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "publicacao", todas: true }),
      }),
    ]);
    toast({ title: "Todos os alertas marcados como lidos" });
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Processos monitorados
              </p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-brand-navy">
                <Activity className="h-5 w-5" />
                {totalMonitorados}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ultima verificacao
              </p>
              <p className="mt-1 text-sm text-slate-700">
                {formatDateTime(ultimaVerificacao)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Alertas nao lidos
              </p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-semibold text-red-600">
                <Bell className="h-5 w-5" />
                {alertas.length}
              </p>
            </div>
          </div>
          <Button
            onClick={handleVerificar}
            disabled={verificando}
            className="bg-brand-navy hover:bg-brand-navy/90"
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4",
                verificando && "animate-spin",
              )}
            />
            {verificando ? "Verificando..." : "Verificar Agora"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Alertas nao lidos</CardTitle>
            <CardDescription>
              {alertas.length === 0
                ? "Nenhum alerta pendente."
                : `${alertas.length} alerta${alertas.length === 1 ? "" : "s"} aguardando revisao.`}
            </CardDescription>
          </div>
          {alertas.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarcarTodasLidas}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {alertas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tudo em dia. Quando o Datajud ou o DJEN devolverem novidades elas
              aparecem aqui.
            </p>
          ) : (
            <ul className="space-y-2">
              {alertas.map((a) => (
                <li
                  key={`${a.tipo}-${a.id}`}
                  className="flex flex-wrap items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      a.tipo === "movimentacao"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700",
                    )}
                    aria-hidden="true"
                  >
                    {a.tipo === "movimentacao" ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <Newspaper className="h-4 w-4" />
                    )}
                  </span>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(a.data)}
                      </span>
                      <span aria-hidden="true">•</span>
                      <Link
                        href={`/app/processos/${a.processo.id}`}
                        className="font-mono text-xs font-medium text-brand-navy hover:underline"
                      >
                        {a.processo.numero}
                      </Link>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {a.processo.tribunal}
                      </span>
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Novo
                      </span>
                      {a.geraIntimacao && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Intimacao detectada
                        </span>
                      )}
                      {a.ehDecisao && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Decisao detectada
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-800">{a.titulo}</p>
                    {a.ehDecisao && (
                      <p className="text-[11px] font-medium text-red-700">
                        Verificar necessidade de recurso.
                      </p>
                    )}
                    {a.geraIntimacao && (
                      <p className="text-[11px] font-medium text-red-700">
                        Pode gerar prazo — verificar.
                      </p>
                    )}
                    {a.detalhe && (
                      <p className="text-xs text-muted-foreground">
                        {a.detalhe}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Gestor: {a.processo.gestor}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarcarLida(a.tipo, a.id)}
                  >
                    Marcar como lida
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processos monitorados</CardTitle>
          <CardDescription>
            Ative ou desative o monitoramento individual e veja o estado de
            cada processo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum processo cadastrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Processo</th>
                    <th className="px-3 py-2">Tribunal</th>
                    <th className="px-3 py-2">Gestor</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Ultima verificacao</th>
                    <th className="px-3 py-2">Novos alertas</th>
                  </tr>
                </thead>
                <tbody>
                  {processos.map((p) => (
                    <tr key={p.id} className="border-b align-top hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <Link
                          href={`/app/processos/${p.id}`}
                          className="font-mono text-xs text-brand-navy hover:underline"
                        >
                          {p.numero}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {p.tribunal}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {p.gestor}
                      </td>
                      <td className="px-3 py-2">
                        <Switch
                          checked={p.monitoramentoAtivo}
                          onCheckedChange={(v) => handleToggle(p.id, v)}
                          disabled={togglingId === p.id}
                          ariaLabel={`Monitorar ${p.numero}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-700">
                        {formatDateTime(p.ultimaVerificacao)}
                        {p.ultimoErro && (
                          <p className="text-[10px] text-red-600">
                            erro: {p.ultimoErro}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {p.novosAlertas > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                            {p.novosAlertas}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
