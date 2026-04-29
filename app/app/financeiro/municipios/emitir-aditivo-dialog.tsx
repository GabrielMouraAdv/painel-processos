"use client";

import * as React from "react";
import { Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ESCRITORIOS_EMISSORES,
  findEscritorio,
} from "@/lib/escritorios-emissores";
import { TIPO_ADITIVO_LABELS } from "@/lib/financeiro";

const TIPOS = [
  "PRORROGACAO",
  "REAJUSTE",
  "ALTERACAO_OBJETO",
  "ALTERACAO_VALOR",
  "OUTRO",
] as const;
type TipoAditivoT = (typeof TIPOS)[number];

const TIPOS_VALIDOS = new Set<string>(TIPOS);

const FUNDAMENTOS_PADRAO: Record<TipoAditivoT, string> = {
  PRORROGACAO:
    "Art. 105, da Lei n. 14.133/2021, c/c clausulas contratuais que admitem a prorrogacao do prazo de vigencia do contrato, mantida a vantajosidade da contratacao.",
  REAJUSTE:
    "Art. 25, II, da Lei n. 14.133/2021, c/c clausula contratual de reajuste anual pelo IPCA/IGP-M, considerando o decurso de 12 (doze) meses desde a contratacao.",
  ALTERACAO_OBJETO:
    "Art. 124, I, alinea 'a', da Lei n. 14.133/2021, que admite a alteracao unilateral do contrato por modificacao do projeto ou das especificacoes para melhor adequacao tecnica aos objetivos.",
  ALTERACAO_VALOR:
    "Art. 124, II, alinea 'b', da Lei n. 14.133/2021, c/c art. 125, que admite o acrescimento ou a supressao do valor inicial atualizado do contrato em ate 25%.",
  OUTRO: "",
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contratoId: string;
  municipioNome: string;
  bancasContrato: string[];
};

export function EmitirAditivoDialog({
  open,
  onOpenChange,
  contratoId,
  municipioNome,
  bancasContrato,
}: Props) {
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [tipo, setTipo] = React.useState<TipoAditivoT>("PRORROGACAO");
  const [justificativa, setJustificativa] = React.useState("");
  const [fundamento, setFundamento] = React.useState(
    FUNDAMENTOS_PADRAO.PRORROGACAO,
  );
  const [escritorioSlug, setEscritorioSlug] = React.useState("");
  const [advogadoIdx, setAdvogadoIdx] = React.useState("0");

  const escritoriosDisponiveis = React.useMemo(() => {
    const fromContract = ESCRITORIOS_EMISSORES.filter((e) =>
      bancasContrato.includes(e.slug),
    );
    return fromContract.length > 0 ? fromContract : ESCRITORIOS_EMISSORES;
  }, [bancasContrato]);

  React.useEffect(() => {
    if (open) {
      setTipo("PRORROGACAO");
      setJustificativa("");
      setFundamento(FUNDAMENTOS_PADRAO.PRORROGACAO);
      setEscritorioSlug(
        escritoriosDisponiveis.length === 1
          ? escritoriosDisponiveis[0]!.slug
          : "",
      );
      setAdvogadoIdx("0");
    }
  }, [open, escritoriosDisponiveis]);

  const escritorioSel = React.useMemo(
    () => (escritorioSlug ? findEscritorio(escritorioSlug) : null),
    [escritorioSlug],
  );

  function changeTipo(t: TipoAditivoT) {
    setTipo(t);
    if (!fundamento.trim() || Object.values(FUNDAMENTOS_PADRAO).includes(fundamento)) {
      setFundamento(FUNDAMENTOS_PADRAO[t]);
    }
  }

  async function gerar() {
    if (!TIPOS_VALIDOS.has(tipo)) {
      toast({ variant: "destructive", title: "Tipo invalido" });
      return;
    }
    if (justificativa.trim().length < 10) {
      toast({
        variant: "destructive",
        title: "Justificativa muito curta",
        description: "Descreva com pelo menos 10 caracteres.",
      });
      return;
    }
    if (fundamento.trim().length < 10) {
      toast({
        variant: "destructive",
        title: "Fundamento muito curto",
        description: "Descreva com pelo menos 10 caracteres.",
      });
      return;
    }
    if (!escritorioSlug) {
      toast({
        variant: "destructive",
        title: "Selecione o escritorio emissor",
      });
      return;
    }

    setPending(true);
    try {
      const res = await fetch(
        `/api/financeiro/contratos/${contratoId}/aditivo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo,
            justificativa: justificativa.trim(),
            fundamento: fundamento.trim(),
            escritorioSlug,
            advogadoIdx: parseInt(advogadoIdx, 10) || 0,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao gerar aditivo",
          description: json.error ?? `Status ${res.status}`,
        });
        return;
      }

      // Faz download
      if (json.url) {
        const a = document.createElement("a");
        a.href = json.url;
        a.download = json.nome ?? "aditivo.docx";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else if (json.base64) {
        const blob = b64ToBlob(
          json.base64,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = json.nome ?? "aditivo.docx";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Aditivo gerado",
        description: json.url
          ? "Documento salvo no Storage e baixado."
          : "Storage indisponivel — documento baixado direto.",
      });
      onOpenChange(false);
    } catch (e) {
      console.error("[emitir-aditivo] erro:", e);
      toast({ variant: "destructive", title: "Erro de conexao" });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Emitir Solicitacao de Aditivo — {municipioNome}
          </DialogTitle>
          <DialogDescription>
            Gera o documento .docx com timbre do escritorio emissor e ja faz
            o download.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>
              Escritorio emissor <span className="text-red-600">*</span>
            </Label>
            <Select
              value={escritorioSlug}
              onValueChange={(v) => {
                setEscritorioSlug(v);
                setAdvogadoIdx("0");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o escritorio emissor" />
              </SelectTrigger>
              <SelectContent>
                {escritoriosDisponiveis.map((e) => (
                  <SelectItem key={e.slug} value={e.slug}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {escritoriosDisponiveis.length > 1 && !escritorioSlug && (
              <p className="text-[11px] text-amber-700">
                O contrato tem mais de uma banca vinculada. Selecione qual sera
                o emissor do aditivo.
              </p>
            )}
          </div>

          {escritorioSel && escritorioSel.advogados.length > 1 && (
            <div className="space-y-1.5">
              <Label>Advogado que assina</Label>
              <Select value={advogadoIdx} onValueChange={setAdvogadoIdx}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {escritorioSel.advogados.map((a, idx) => (
                    <SelectItem key={a.oab} value={String(idx)}>
                      {a.nome} ({a.oab})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              Tipo de aditivo <span className="text-red-600">*</span>
            </Label>
            <Select
              value={tipo}
              onValueChange={(v) => changeTipo(v as TipoAditivoT)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_ADITIVO_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Justificativa <span className="text-red-600">*</span>
            </Label>
            <Textarea
              rows={4}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo do aditivo (continuidade dos servicos, atualizacao monetaria, ampliacao de escopo, etc.)."
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Fundamento legal <span className="text-red-600">*</span>
            </Label>
            <Textarea
              rows={3}
              value={fundamento}
              onChange={(e) => setFundamento(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Sugestao automatica conforme o tipo. Edite livremente se
              necessario.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button onClick={gerar} disabled={pending} className="gap-1.5">
            <Download className="h-4 w-4" />
            {pending ? "Gerando..." : "Gerar e baixar .docx"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function b64ToBlob(b64: string, contentType: string): Blob {
  const byteChars = atob(b64);
  const byteNumbers = new Array<number>(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}
