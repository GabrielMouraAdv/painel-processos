import Link from "next/link";
import { Plus } from "lucide-react";

import { ProcessoFormDialog } from "@/components/eleitoral/processo-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatarDataUTC,
  labelClasseEleitoral,
  labelStatusEleitoral,
  STATUS_ENCERRADOS,
  statusPrazoInfo,
} from "@/lib/eleitoral-labels";
import {
  exigirPaginaEleitoral,
  listarUsuariosEleitoral,
} from "@/lib/eleitoral-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EleitoralProcessosPage() {
  const session = await exigirPaginaEleitoral();
  const escritorioId = session.user.escritorioId;

  const [processos, usuarios] = await Promise.all([
    prisma.processoEleitoral.findMany({
      where: { escritorioId },
      orderBy: { createdAt: "desc" },
      include: {
        coordenador: { select: { nome: true } },
        advogadoResp: { select: { nome: true } },
        prazos: {
          where: { status: { notIn: STATUS_ENCERRADOS } },
          orderBy: { data: "asc" },
          take: 1,
          include: { responsavel: { select: { nome: true } } },
        },
      },
    }),
    listarUsuariosEleitoral(escritorioId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Processos eleitorais</h1>
          <p className="text-sm text-muted-foreground">
            {processos.length} processo(s) cadastrado(s)
          </p>
        </div>
        <ProcessoFormDialog
          mode="create"
          usuarios={usuarios}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Novo processo
            </Button>
          }
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Processo</TableHead>
              <TableHead>Partes</TableHead>
              <TableHead>Coordenador</TableHead>
              <TableHead>Proximo prazo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processos.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhum processo cadastrado. Clique em &quot;Novo
                  processo&quot; para comecar.
                </TableCell>
              </TableRow>
            )}
            {processos.map((p) => {
              const proximo = p.prazos[0];
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/app/eleitoral/processos/${p.id}`}
                      className="font-medium text-brand-navy underline-offset-2 hover:underline"
                    >
                      {labelClasseEleitoral(p.classe)} {p.numero}
                    </Link>
                    {p.apelido && (
                      <p className="text-xs text-muted-foreground">
                        {p.apelido}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <p className="truncate text-sm">
                      {p.parteAutora} x {p.parteRe}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.coordenador?.nome ?? "—"}
                  </TableCell>
                  <TableCell>
                    {proximo ? (
                      <div>
                        <span
                          className="inline-block rounded border-l-4 px-1.5 py-0.5 text-xs font-semibold"
                          style={{
                            borderLeftColor: statusPrazoInfo(proximo.status)
                              .cor,
                            color: statusPrazoInfo(proximo.status).cor,
                          }}
                        >
                          {formatarDataUTC(proximo.data)}
                        </span>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {proximo.tarefa}
                          {proximo.responsavel
                            ? ` — ${proximo.responsavel.nome}`
                            : ""}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === "EM_TRAMITACAO" ? "secondary" : "outline"
                      }
                    >
                      {labelStatusEleitoral(p.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
