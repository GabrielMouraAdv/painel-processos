"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESCRITORIOS_EMISSORES } from "@/lib/escritorios-emissores";

type Props = {
  de: string;
  ate: string;
};

export function PeriodoFilter({ de: initialDe, ate: initialAte }: Props) {
  const router = useRouter();
  const [de, setDe] = React.useState(initialDe);
  const [ate, setAte] = React.useState(initialAte);
  const [emissorSlug, setEmissorSlug] = React.useState<string>("");
  const [advogadoIdx, setAdvogadoIdx] = React.useState<number>(0);

  const emissorAtual = React.useMemo(
    () => ESCRITORIOS_EMISSORES.find((e) => e.slug === emissorSlug) ?? null,
    [emissorSlug],
  );

  function apply() {
    const params = new URLSearchParams();
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    const qs = params.toString();
    router.push(qs ? `/app/relatorios?${qs}` : "/app/relatorios");
  }

  function clearAll() {
    setDe("");
    setAte("");
    router.push("/app/relatorios");
  }

  function trocarEmissor(slug: string) {
    setEmissorSlug(slug);
    setAdvogadoIdx(0);
  }

  const csvHref = (() => {
    const params = new URLSearchParams();
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    const qs = params.toString();
    return qs ? `/api/relatorios/csv?${qs}` : "/api/relatorios/csv";
  })();

  const podeExportarPdf = !!emissorAtual;
  const pdfHref = (() => {
    if (!emissorAtual) return "#";
    const params = new URLSearchParams();
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    params.set("emissor", emissorAtual.slug);
    params.set("advogado", String(advogadoIdx));
    return `/api/relatorios/gerencial-pdf?${params.toString()}`;
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[140px] flex-col gap-1">
          <Label className="text-xs">Inicio</Label>
          <Input
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
          />
        </div>
        <div className="flex min-w-[140px] flex-col gap-1">
          <Label className="text-xs">Fim</Label>
          <Input
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
          />
        </div>
        <Button
          onClick={apply}
          className="bg-brand-navy hover:bg-brand-navy/90"
        >
          Aplicar
        </Button>
        <Button variant="ghost" onClick={clearAll}>
          Limpar
        </Button>
        <div className="ml-auto">
          <Button asChild variant="outline">
            <a href={csvHref} download>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t pt-3">
        <div className="flex min-w-[260px] flex-col gap-1">
          <Label className="text-xs">
            Escritorio responsavel (PDF){" "}
            <span className="text-red-600">*</span>
          </Label>
          <Select value={emissorSlug} onValueChange={trocarEmissor}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o escritorio emissor" />
            </SelectTrigger>
            <SelectContent>
              {ESCRITORIOS_EMISSORES.map((e) => (
                <SelectItem key={e.slug} value={e.slug}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {emissorAtual && emissorAtual.advogados.length > 1 && (
          <div className="flex min-w-[280px] flex-col gap-1">
            <Label className="text-xs">Advogado que assina</Label>
            <Select
              value={String(advogadoIdx)}
              onValueChange={(v) => setAdvogadoIdx(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {emissorAtual.advogados.map((a, i) => (
                  <SelectItem key={a.oab} value={String(i)}>
                    {a.nome} — {a.oab}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="ml-auto">
          {podeExportarPdf ? (
            <Button asChild variant="outline">
              <a href={pdfHref} download>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar PDF
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
