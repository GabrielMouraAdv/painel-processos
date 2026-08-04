import Link from "next/link";
import { Activity, CheckCircle2, Plus } from "lucide-react";

import {
  DispensarDeteccaoDialog,
  OutroEscritorioDialog,
  ReabrirDeteccaoButton,
} from "@/components/eleitoral/deteccao-acoes";
import { ProcessoFormDialog } from "@/components/eleitoral/processo-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatarDataHoraRecife } from "@/lib/eleitoral-labels";
import {
  exigirPaginaEleitoral,
  listarUsuariosEleitoral,
} from "@/lib/eleitoral-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const LABEL_RESOLUCAO: Record<string, string> = {
  CADASTRADO: "Cadastrado",
  DISPENSADO: "Dispensado",
  OUTRO_ESCRITORIO: "Outro escritorio",
};

export default async function EleitoralMonitoramentoPage() {
  const session = await exigirPaginaEleitoral();
  const escritorioId = session.user.escritorioId;

  const [pendentes, resolvidas, usuarios] = await Promise.all([
    prisma.deteccaoEleitoral.findMany({
      where: { escritorioId, status: "PENDENTE" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.deteccaoEleitoral.findMany({
      where: { escritorioId, status: { not: "PENDENTE" } },
      orderBy: { resolvidoEm: "desc" },
      take: 20,
      include: {
        resolvidoPor: { select: { nome: true } },
        processo: { select: { id: true } },
      },
    }),
    listarUsuariosEleitoral(escritorioId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Monitoramento</h1>
        <p className="text-sm text-muted-foreground">
          Processos novos detectados pela rotina de monitoramento (PDPJ).
          Cadastre no acervo, dispense ou marque como responsabilidade de
          outro escritorio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Aguardando triagem
            {pendentes.length > 0 && (
              <Badge variant="destructive">{pendentes.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendentes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma deteccao pendente. Quando a rotina encontrar um processo
              novo, ele aparece aqui.
            </p>
          )}
          {pendentes.map((d) => (
            <div key={d.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-brand-navy">
                    {d.classe ? `${d.classe} ` : ""}
                    {d.numero}
                  </p>
                  {(d.parteAutora || d.parteRe) && (
                    <p className="mt-0.5 text-sm">
                      {d.parteAutora ?? "?"} x {d.parteRe ?? "?"}
                    </p>
                  )}
                  {d.objeto && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {d.objeto}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.relator ? `Relator: ${d.relator} · ` : ""}
                    {d.orgao ? `${d.orgao} · ` : ""}
                    Detectado em {formatarDataHoraRecife(d.createdAt)} (
                    {d.fonte})
                  </p>
                  {d.observacoes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.observacoes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <ProcessoFormDialog
                    mode="create"
                    usuarios={usuarios}
                    deteccaoId={d.id}
                    defaults={{
                      numero: d.numero,
                      parteAutora: d.parteAutora ?? "",
                      parteRe: d.parteRe ?? "",
                      objeto: d.objeto ?? "",
                      relator: d.relator ?? "",
                    }}
                    trigger={
                      <Button size="sm">
                        <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Cadastrar
                      </Button>
                    }
                  />
                  <OutroEscritorioDialog deteccaoId={d.id} numero={d.numero} />
                  <DispensarDeteccaoDialog
                    deteccaoId={d.id}
                    numero={d.numero}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4" />
            Ultimas triagens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {resolvidas.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma deteccao triada ainda.
            </p>
          )}
          {resolvidas.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {d.status === "CADASTRADO" && d.processo ? (
                    <Link
                      href={`/app/eleitoral/processos/${d.processo.id}`}
                      className="font-mono font-semibold text-brand-navy hover:underline"
                    >
                      {d.numero}
                    </Link>
                  ) : (
                    <span className="font-mono font-semibold">{d.numero}</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {d.resolvidoPor?.nome ?? "—"}
                  {d.resolvidoEm
                    ? ` em ${formatarDataHoraRecife(d.resolvidoEm)}`
                    : ""}
                  {d.status === "OUTRO_ESCRITORIO" && d.escritorioResponsavel
                    ? ` · Responsavel: ${d.escritorioResponsavel}`
                    : ""}
                  {d.status === "DISPENSADO" && d.motivoDispensa
                    ? ` · ${d.motivoDispensa}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge
                  variant={
                    d.status === "CADASTRADO"
                      ? "default"
                      : d.status === "OUTRO_ESCRITORIO"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {LABEL_RESOLUCAO[d.status] ?? d.status}
                </Badge>
                {d.status !== "CADASTRADO" && (
                  <ReabrirDeteccaoButton deteccaoId={d.id} numero={d.numero} />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
