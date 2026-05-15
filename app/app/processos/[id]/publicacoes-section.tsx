"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Info, Newspaper, RefreshCw } from "lucide-react";

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
import { useToast } from "@/hooks/use-toast";

export type PublicacaoIntegralItem = {
  id: string;
  data: string;
  nome: string;
  conteudoIntegral: string | null;
  djenLinkOficial: string | null;
};

type Props = {
  processoId: string;
  numeroProcesso: string;
  tribunal: string;
  publicacoes: PublicacaoIntegralItem[];
  totalPendentes: number;
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function preview(texto: string | null, max = 200): string {
  if (!texto) return "";
  const compact = texto.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return compact.slice(0, max) + "...";
}

export function PublicacoesSection({
  processoId,
  numeroProcesso,
  tribunal,
  publicacoes,
  totalPendentes,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [buscando, setBuscando] = React.useState(false);
  const [aberta, setAberta] = React.useState<PublicacaoDjenDetalhe | null>(null);

  const ehTrabalhista = numeroProcesso.replace(/\D+/g, "").charAt(13) === "5";

  async function buscarPendentes() {
    setBuscando(true);
    try {
      const res = await fetch(
        `/api/processos/${processoId}/buscar-publicacoes-pendentes`,
        { method: "POST" },
      );
      const json = (await res.json().catch(() => ({}))) as {
        buscados?: number;
        encontrados?: number;
        indisponiveis?: number;
        erros?: number;
        error?: string;
      };
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({
        title: "Busca concluida",
        description: `${json.encontrados ?? 0} encontradas, ${json.indisponiveis ?? 0} indisponiveis, ${json.erros ?? 0} erros (de ${json.buscados ?? 0}).`,
      });
      router.refresh();
    } finally {
      setBuscando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Newspaper className="h-4 w-4 text-orange-600" />
              Publicacoes (DJEN — Inteiro Teor)
            </CardTitle>
            <CardDescription>
              {publicacoes.length === 0
                ? "Nenhuma publicacao com texto integral disponivel ainda."
                : `${publicacoes.length} publicacao${publicacoes.length === 1 ? "" : "oes"} com texto integral.`}
              {totalPendentes > 0 && (
                <>
                  {" "}
                  <span className="text-orange-700">
                    ({totalPendentes} pendente
                    {totalPendentes === 1 ? "" : "s"} de busca)
                  </span>
                </>
              )}
            </CardDescription>
          </div>
          {!ehTrabalhista && totalPendentes > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={buscarPendentes}
              disabled={buscando}
              title="Tenta recuperar via DJEN o texto das movimentacoes ainda sem inteiro teor."
            >
              <RefreshCw
                className={`mr-1.5 h-4 w-4 ${buscando ? "animate-spin" : ""}`}
              />
              {buscando ? "Buscando..." : "Buscar publicacoes faltantes"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {ehTrabalhista ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            Processos da Justica do Trabalho nao sao integrados ao DJEN por este
            painel.
          </p>
        ) : publicacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Quando o sistema detectar uma movimentacao com publicacao no DJEN, o
            texto completo aparecera aqui automaticamente. Voce tambem pode
            disparar a busca manualmente acima.
          </p>
        ) : (
          <ul className="space-y-2">
            {publicacoes.map((p) => (
              <li
                key={p.id}
                className="rounded-md border border-slate-200 bg-white p-3 text-sm hover:border-brand-navy/40"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDateTime(p.data)}</span>
                  <span aria-hidden="true">•</span>
                  <span className="font-medium text-brand-navy">{p.nome}</span>
                  {p.djenLinkOficial && (
                    <a
                      href={p.djenLinkOficial}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      diario oficial
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAberta({
                      numeroProcesso,
                      tribunal,
                      dataPublicacao: p.data,
                      conteudo: p.conteudoIntegral ?? "",
                      linkOficial: p.djenLinkOficial,
                      tipoPublicacao: p.nome,
                    })
                  }
                  className="mt-1 text-left text-sm text-slate-700 hover:text-brand-navy"
                >
                  {preview(p.conteudoIntegral)}
                </button>
                <div className="mt-1 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-emerald-700" />
                  <button
                    type="button"
                    onClick={() =>
                      setAberta({
                        numeroProcesso,
                        tribunal,
                        dataPublicacao: p.data,
                        conteudo: p.conteudoIntegral ?? "",
                        linkOficial: p.djenLinkOficial,
                        tipoPublicacao: p.nome,
                      })
                    }
                    className="text-[11px] font-medium text-emerald-700 hover:underline"
                  >
                    Ver publicacao completa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          O texto completo das publicacoes vem do DJEN (Diario Eletronico
          Nacional). Nem todas as publicacoes estao disponiveis: tribunais que
          ainda nao migraram para o DJEN ou publicacoes muito antigas podem nao
          ter texto integral.
        </p>
      </CardContent>

      <PublicacaoDjenDialog
        detalhe={aberta}
        onOpenChange={(o) => {
          if (!o) setAberta(null);
        }}
      />
    </Card>
  );
}
