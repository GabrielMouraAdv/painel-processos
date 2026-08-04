import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  FolderOpen,
  Pencil,
  Plus,
} from "lucide-react";

import { AtualizarMovimentosButton } from "@/components/eleitoral/atualizar-movimentos-button";
import { ExcluirDocumentoButton } from "@/components/eleitoral/excluir-documento-button";
import { ExcluirProcessoButton } from "@/components/eleitoral/excluir-processo-button";
import { PrazoAcoes } from "@/components/eleitoral/prazo-acoes";
import { PrazoFormDialog } from "@/components/eleitoral/prazo-form-dialog";
import { ProcessoFormDialog } from "@/components/eleitoral/processo-form-dialog";
import { UploadDocumentoDialog } from "@/components/eleitoral/upload-documento-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  formatarTamanhoArquivo,
  labelCategoriaDocumento,
  labelClasseEleitoral,
  labelPoloEleitoral,
  labelStatusEleitoral,
} from "@/lib/eleitoral-labels";
import {
  exigirPaginaEleitoral,
  listarUsuariosEleitoral,
} from "@/lib/eleitoral-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EleitoralProcessoPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await exigirPaginaEleitoral();
  const escritorioId = session.user.escritorioId;

  const [processo, usuarios] = await Promise.all([
    prisma.processoEleitoral.findFirst({
      where: { id: params.id, escritorioId },
      include: {
        coordenador: { select: { id: true, nome: true } },
        advogadoResp: { select: { id: true, nome: true } },
        prazos: {
          orderBy: [{ cumprido: "asc" }, { data: "asc" }],
          include: { responsavel: { select: { id: true, nome: true } } },
        },
        movimentos: { orderBy: { dataHora: "desc" } },
        documentos: {
          orderBy: { createdAt: "desc" },
          include: { uploadedBy: { select: { nome: true } } },
        },
      },
    }),
    listarUsuariosEleitoral(escritorioId),
  ]);
  if (!processo) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/app/eleitoral/processos"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Processos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">
              {labelClasseEleitoral(processo.classe)} {processo.numero}
            </h1>
            {processo.apelido && (
              <p className="text-sm text-muted-foreground">
                &quot;{processo.apelido}&quot;
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <AtualizarMovimentosButton processoId={processo.id} />
            <ProcessoFormDialog
              mode="edit"
              processo={{
                id: processo.id,
                numero: processo.numero,
                classe: processo.classe,
                apelido: processo.apelido,
                parteAutora: processo.parteAutora,
                parteRe: processo.parteRe,
                polo: processo.polo,
                objeto: processo.objeto,
                relator: processo.relator,
                status: processo.status,
                resultado: processo.resultado,
                observacoes: processo.observacoes,
                coordenadorId: processo.coordenador?.id ?? null,
                advogadoRespId: processo.advogadoResp?.id ?? null,
              }}
              usuarios={usuarios}
              trigger={
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Editar
                </Button>
              }
            />
            <ExcluirProcessoButton
              processoId={processo.id}
              numero={processo.numero}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-x-8 gap-y-3 pt-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Partes</p>
            <p className="font-medium">
              {processo.parteAutora} x {processo.parteRe}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Nosso polo
            </p>
            <p className="font-medium">{labelPoloEleitoral(processo.polo)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Relator</p>
            <p className="font-medium">{processo.relator ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Coordenador
            </p>
            <p className="font-medium">{processo.coordenador?.nome ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">
              Advogado responsavel
            </p>
            <p className="font-medium">{processo.advogadoResp?.nome ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Status</p>
            <p className="font-medium">
              {labelStatusEleitoral(processo.status)}
              {processo.resultado ? ` — ${processo.resultado}` : ""}
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="text-xs uppercase text-muted-foreground">Objeto</p>
            <p>{processo.objeto}</p>
          </div>
          {processo.observacoes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs uppercase text-muted-foreground">
                Observacoes
              </p>
              <p>{processo.observacoes}</p>
            </div>
          )}
          {(processo.datajudOrgao || processo.ultimaConsultaDatajud) && (
            <div className="sm:col-span-2 lg:col-span-3 text-xs text-muted-foreground">
              {processo.datajudOrgao && (
                <span>Orgao julgador (Datajud): {processo.datajudOrgao}. </span>
              )}
              {processo.ultimaConsultaDatajud && (
                <span>
                  Ultima consulta ao Datajud:{" "}
                  {formatarDataHoraRecife(processo.ultimaConsultaDatajud)}.
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4" />
            Pecas do processo ({processo.documentos.length})
          </CardTitle>
          <UploadDocumentoDialog processoId={processo.id} />
        </CardHeader>
        <CardContent className="space-y-3">
          {processo.documentos.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma peca enviada. Use &quot;Enviar peca&quot; para anexar
              iniciais, defesas, decisoes, provas e demais arquivos.
            </p>
          )}
          {processo.documentos.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{d.nome}</p>
                  <Badge variant="secondary">
                    {labelCategoriaDocumento(d.categoria)}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {d.nomeArquivo} · {formatarTamanhoArquivo(d.tamanho)} ·
                  enviado por {d.uploadedBy.nome} em{" "}
                  {formatarDataHoraRecife(d.createdAt)}
                </p>
                {d.observacoes && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {d.observacoes}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button asChild size="sm" variant="outline">
                  <a href={d.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" />
                    Abrir
                  </a>
                </Button>
                <ExcluirDocumentoButton documentoId={d.id} nome={d.nome} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Prazos
            </CardTitle>
            <PrazoFormDialog
              mode="create"
              processoId={processo.id}
              usuarios={usuarios}
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Novo prazo
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {processo.prazos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum prazo cadastrado.
              </p>
            )}
            {processo.prazos.map((p) => {
              const dias = diasAteUTC(p.data);
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
                    p.cumprido ? "opacity-60" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {p.tarefa}
                      {p.responsavel ? ` — ${p.responsavel.nome}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataUTC(p.data)}
                      {p.hora ? ` as ${p.hora}` : ""}
                      {!p.cumprido &&
                        (dias < 0
                          ? ` · vencido ha ${Math.abs(dias)} dia(s)`
                          : dias === 0
                            ? " · e hoje"
                            : dias === 1
                              ? " · amanha"
                              : ` · em ${dias} dias`)}
                      {p.cumprido && " · cumprido"}
                    </p>
                    {p.observacoes && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.observacoes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <PrazoFormDialog
                      mode="edit"
                      prazo={{
                        id: p.id,
                        tarefa: p.tarefa,
                        data: p.data.toISOString(),
                        hora: p.hora,
                        observacoes: p.observacoes,
                        responsavelId: p.responsavel?.id ?? null,
                      }}
                      usuarios={usuarios}
                      trigger={
                        <Button size="sm" variant="outline" title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <PrazoAcoes prazoId={p.id} cumprido={p.cumprido} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Movimentos ({processo.movimentos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[560px] space-y-3 overflow-y-auto">
            {processo.movimentos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum movimento importado. Clique em &quot;Atualizar
                movimentos&quot; para consultar o TRE-PE via Datajud.
              </p>
            )}
            {processo.movimentos.map((m) => (
              <div key={m.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{m.nome}</p>
                  <Badge variant="outline" className="shrink-0">
                    {formatarDataHoraRecife(m.dataHora)}
                  </Badge>
                </div>
                {m.complemento && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.complemento}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
