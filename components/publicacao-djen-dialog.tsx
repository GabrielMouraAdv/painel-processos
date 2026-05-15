"use client";

import * as React from "react";
import { ExternalLink, Newspaper } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export type PublicacaoDjenDetalhe = {
  numeroProcesso: string;
  tribunal: string;
  dataPublicacao: string;
  conteudo: string;
  linkOficial: string | null;
  tipoPublicacao?: string | null;
};

type Props = {
  detalhe: PublicacaoDjenDetalhe | null;
  onOpenChange: (open: boolean) => void;
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function PublicacaoDjenDialog({ detalhe, onOpenChange }: Props) {
  const open = detalhe !== null;
  const { toast } = useToast();
  const [copying, setCopying] = React.useState(false);

  async function copiar() {
    if (!detalhe) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(detalhe.conteudo);
      toast({ title: "Texto copiado" });
    } catch {
      toast({
        variant: "destructive",
        title: "Erro ao copiar",
        description: "Selecione o texto manualmente.",
      });
    } finally {
      setCopying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {detalhe && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-700"
                  aria-hidden="true"
                >
                  <Newspaper className="h-4 w-4" />
                </span>
                Publicacao no DJEN
              </DialogTitle>
              <DialogDescription>
                <span className="font-mono">{detalhe.numeroProcesso}</span>
                {" · "}
                {detalhe.tribunal}
                {" · "}
                {formatDateTime(detalhe.dataPublicacao)}
                {detalhe.tipoPublicacao && (
                  <>
                    {" · "}
                    {detalhe.tipoPublicacao}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-4">
              <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-slate-800">
                {detalhe.conteudo}
              </pre>
            </div>

            <p className="text-[11px] text-muted-foreground">
              O texto completo das publicacoes vem do DJEN (Diario Eletronico
              Nacional). Nem todas as publicacoes estao disponiveis: tribunais
              que ainda nao migraram para o DJEN ou publicacoes muito antigas
              podem nao ter texto integral.
            </p>

            <DialogFooter className="gap-2 sm:gap-2">
              {detalhe.linkOficial && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mr-auto"
                >
                  <a
                    href={detalhe.linkOficial}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Abrir no diario oficial
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={copiar}
                disabled={copying}
              >
                {copying ? "Copiando..." : "Copiar texto"}
              </Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
