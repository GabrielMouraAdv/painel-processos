import Link from "next/link";
import {
  Activity,
  CalendarClock,
  FileText,
  Gavel,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  diasAteUTC,
  formatarDataHoraRecife,
  formatarDataUTC,
} from "@/lib/eleitoral-labels";
import { exigirPaginaEleitoral } from "@/lib/eleitoral-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EleitoralDashboardPage() {
  const session = await exigirPaginaEleitoral();
  const escritorioId = session.user.escritorioId;

  const hoje = new Date();
  const hojeUTC = new Date(
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()),
  );
  const em7 = new Date(hojeUTC);
  em7.setUTCDate(em7.getUTCDate() + 7);
  em7.setUTCHours(23, 59, 59, 999);

  const [
    processosAtivos,
    prazosPendentes,
    proximosPrazos,
    ultimoRelatorio,
    ultimosMovimentos,
  ] = await Promise.all([
    prisma.processoEleitoral.count({
      where: { escritorioId, status: "EM_TRAMITACAO" },
    }),
    prisma.prazoEleitoral.count({
      where: { cumprido: false, processo: { escritorioId } },
    }),
    prisma.prazoEleitoral.findMany({
      where: {
        cumprido: false,
        data: { lte: em7 },
        processo: { escritorioId },
      },
      orderBy: { data: "asc" },
      take: 8,
      include: {
        processo: {
          select: { id: true, numero: true, apelido: true },
        },
        responsavel: { select: { nome: true } },
      },
    }),
    prisma.relatorioEleitoral.findFirst({
      where: { escritorioId },
      orderBy: [{ dataReferencia: "desc" }, { createdAt: "desc" }],
      include: { uploadedBy: { select: { nome: true } } },
    }),
    prisma.movimentoEleitoral.findMany({
      where: { processo: { escritorioId } },
      orderBy: { dataHora: "desc" },
      take: 6,
      include: {
        processo: { select: { id: true, numero: true, apelido: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Eleitoral 2026</h1>
        <p className="text-sm text-muted-foreground">
          Contencioso eleitoral TRE-PE — processos, prazos e relatorios.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/app/eleitoral/processos">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Processos em tramitacao
              </CardTitle>
              <Gavel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{processosAtivos}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/eleitoral/calendario">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prazos pendentes
              </CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{prazosPendentes}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/eleitoral/relatorios">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ultimo relatorio
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {ultimoRelatorio ? (
                <>
                  <p className="truncate text-sm font-semibold">
                    {ultimoRelatorio.titulo}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatarDataUTC(ultimoRelatorio.dataReferencia)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum relatorio enviado
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Proximos prazos (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {proximosPrazos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum prazo pendente nos proximos 7 dias.
              </p>
            )}
            {proximosPrazos.map((p) => {
              const dias = diasAteUTC(p.data);
              return (
                <Link
                  key={p.id}
                  href={`/app/eleitoral/processos/${p.processo.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {p.tarefa}
                      {p.responsavel ? ` — ${p.responsavel.nome}` : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.processo.apelido ?? p.processo.numero}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant={dias < 0 ? "destructive" : dias <= 1 ? "destructive" : "secondary"}>
                      {formatarDataUTC(p.data)}
                      {p.hora ? ` ${p.hora}` : ""}
                    </Badge>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {dias < 0
                        ? `vencido ha ${Math.abs(dias)} dia(s)`
                        : dias === 0
                          ? "e hoje"
                          : dias === 1
                            ? "amanha"
                            : `em ${dias} dias`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Ultimos movimentos (TRE-PE)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ultimosMovimentos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum movimento importado ainda. Abra um processo e clique em
                &quot;Atualizar movimentos&quot;.
              </p>
            )}
            {ultimosMovimentos.map((m) => (
              <Link
                key={m.id}
                href={`/app/eleitoral/processos/${m.processo.id}`}
                className="block rounded-md border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{m.nome}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatarDataHoraRecife(m.dataHora)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {m.processo.numero}
                  {m.processo.apelido ? ` · ${m.processo.apelido}` : ""}
                  {m.complemento ? ` — ${m.complemento}` : ""}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
