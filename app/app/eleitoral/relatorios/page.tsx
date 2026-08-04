import { ExternalLink, FileText } from "lucide-react";

import { ExcluirRelatorioButton } from "@/components/eleitoral/excluir-relatorio-button";
import { UploadRelatorioDialog } from "@/components/eleitoral/upload-relatorio-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatarDataHoraRecife,
  formatarDataUTC,
} from "@/lib/eleitoral-labels";
import { exigirPaginaEleitoral } from "@/lib/eleitoral-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function EleitoralRelatoriosPage() {
  const session = await exigirPaginaEleitoral();
  const escritorioId = session.user.escritorioId;

  const relatorios = await prisma.relatorioEleitoral.findMany({
    where: { escritorioId },
    orderBy: [{ dataReferencia: "desc" }, { createdAt: "desc" }],
    include: { uploadedBy: { select: { nome: true } } },
  });

  const [ultimo, ...anteriores] = relatorios;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Relatorios</h1>
          <p className="text-sm text-muted-foreground">
            Relatorios de monitoramento do contencioso eleitoral.
          </p>
        </div>
        <UploadRelatorioDialog />
      </div>

      {!ultimo && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum relatorio enviado ainda. Use o botao &quot;Enviar
            relatorio&quot; para subir o primeiro.
          </CardContent>
        </Card>
      )}

      {ultimo && (
        <Card className="border-brand-navy/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Ultimo relatorio
              <Badge>{formatarDataUTC(ultimo.dataReferencia)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{ultimo.titulo}</p>
              <p className="text-xs text-muted-foreground">
                {ultimo.nomeArquivo} · {formatarTamanho(ultimo.tamanho)} ·
                enviado por {ultimo.uploadedBy.nome} em{" "}
                {formatarDataHoraRecife(ultimo.createdAt)}
              </p>
              {ultimo.observacoes && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {ultimo.observacoes}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild>
                <a href={ultimo.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  Abrir
                </a>
              </Button>
              <ExcluirRelatorioButton
                relatorioId={ultimo.id}
                titulo={ultimo.titulo}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {anteriores.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulo</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead className="w-[120px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anteriores.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.titulo}</TableCell>
                  <TableCell>{formatarDataUTC(r.dataReferencia)}</TableCell>
                  <TableCell className="text-sm">
                    {r.uploadedBy.nome}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.nomeArquivo} · {formatarTamanho(r.tamanho)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button asChild size="sm" variant="outline">
                        <a href={r.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <ExcluirRelatorioButton
                        relatorioId={r.id}
                        titulo={r.titulo}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
