"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  File as FileIcon,
  FileImage,
  FileText,
  Files,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export type DocumentoItem = {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  tamanho: number;
  createdAt: string;
  uploadedByNome: string;
};

export type TipoDocumentoOption = {
  key: string;
  label: string;
};

type Props = {
  escopo: "judicial" | "tce";
  processoId: string;
  documentos: DocumentoItem[];
  tiposDocumento: TipoDocumentoOption[];
  canDelete: boolean;
};

const MAX_BYTES = 10 * 1024 * 1024;

const ACCEPT_EXTENSIONS = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function extensionOf(nome: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(nome);
  return m ? m[1].toLowerCase() : "";
}

function isViewable(nome: string): boolean {
  const ext = extensionOf(nome);
  return ["pdf", "jpg", "jpeg", "png"].includes(ext);
}

function IconeArquivo({ nome }: { nome: string }) {
  const ext = extensionOf(nome);
  if (ext === "pdf") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-red-50 text-red-600">
        <FileText className="h-5 w-5" />
      </span>
    );
  }
  if (ext === "doc" || ext === "docx") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-600">
        <FileText className="h-5 w-5" />
      </span>
    );
  }
  if (ext === "jpg" || ext === "jpeg" || ext === "png") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-600">
        <FileImage className="h-5 w-5" />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600">
      <FileIcon className="h-5 w-5" />
    </span>
  );
}

export function DocumentosSection({
  escopo,
  processoId,
  documentos,
  tiposDocumento,
  canDelete,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [excluir, setExcluir] = React.useState<DocumentoItem | null>(null);
  const [excluindo, setExcluindo] = React.useState(false);

  async function handleDelete() {
    if (!excluir) return;
    setExcluindo(true);
    try {
      const res = await fetch(
        `/api/documentos/${excluir.id}?escopo=${escopo}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Erro ao excluir",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Documento excluido" });
      setExcluir(null);
      router.refresh();
    } finally {
      setExcluindo(false);
    }
  }

  const mapTipoLabel = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tiposDocumento) m.set(t.key, t.label);
    return m;
  }, [tiposDocumento]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Files className="h-4 w-4 text-brand-navy" />
              Documentos
            </CardTitle>
            <CardDescription>
              {documentos.length === 0
                ? "Nenhum documento anexado."
                : `${documentos.length} documento${documentos.length === 1 ? "" : "s"} — mais recente primeiro.`}
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="bg-brand-navy hover:bg-brand-navy/90"
            onClick={() => setUploadOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Upload Documento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {documentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Anexe peticoes, acordaos, procuracoes e outros arquivos relevantes.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documentos.map((d) => (
              <li
                key={d.id}
                className="flex items-start gap-3 rounded-md border bg-white p-3"
              >
                <IconeArquivo nome={d.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-navy">
                    {d.nome}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                      {mapTipoLabel.get(d.tipo) ?? d.tipo}
                    </span>
                    <span>{formatBytes(d.tamanho)}</span>
                    <span aria-hidden="true">•</span>
                    <span>{formatDate(d.createdAt)}</span>
                    <span aria-hidden="true">•</span>
                    <span>por {d.uploadedByNome}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {isViewable(d.nome) && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Visualizar em nova aba"
                    >
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Baixar"
                  >
                    <a href={d.url} download={d.nome}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-700 hover:bg-red-50"
                      onClick={() => setExcluir(d)}
                      title="Excluir (apenas admin)"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <UploadDialog
        escopo={escopo}
        processoId={processoId}
        tiposDocumento={tiposDocumento}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={() => {
          setUploadOpen(false);
          router.refresh();
        }}
      />

      <Dialog
        open={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir documento?</DialogTitle>
            <DialogDescription>
              {excluir
                ? `"${excluir.nome}" sera removido do storage e do banco.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setExcluir(null)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={excluindo}
            >
              {excluindo ? "Excluindo..." : "Confirmar exclusao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function UploadDialog({
  escopo,
  processoId,
  tiposDocumento,
  open,
  onOpenChange,
  onUploaded,
}: {
  escopo: "judicial" | "tce";
  processoId: string;
  tiposDocumento: TipoDocumentoOption[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUploaded: () => void;
}) {
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [nome, setNome] = React.useState("");
  const [tipo, setTipo] = React.useState<string>(
    tiposDocumento[0]?.key ?? "outro",
  );
  const [dragging, setDragging] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setFile(null);
      setNome("");
      setTipo(tiposDocumento[0]?.key ?? "outro");
      setDragging(false);
    }
  }, [open, tiposDocumento]);

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast({
        variant: "destructive",
        title: "Arquivo maior que 10MB",
      });
      return;
    }
    if (!ACCEPTED_MIMES.has(f.type)) {
      toast({
        variant: "destructive",
        title: "Tipo de arquivo nao permitido",
        description: "Envie PDF, DOC, DOCX, JPG ou PNG.",
      });
      return;
    }
    setFile(f);
    if (!nome) setNome(f.name);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast({
        variant: "destructive",
        title: "Selecione um arquivo",
      });
      return;
    }
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("escopo", escopo);
      fd.append("processoId", processoId);
      fd.append("tipo", tipo);
      fd.append("nome", nome.trim() || file.name);
      const res = await fetch("/api/documentos/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: json.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Documento enviado" });
      onUploaded();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload de documento</DialogTitle>
          <DialogDescription>
            Formatos aceitos: PDF, DOC, DOCX, JPG, PNG. Limite de 10MB.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0] ?? null;
              pickFile(f);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors",
              dragging
                ? "border-brand-navy bg-brand-navy/5"
                : "border-slate-300 hover:border-brand-navy/60 hover:bg-slate-50",
            )}
          >
            <UploadCloud className="h-8 w-8 text-slate-400" />
            {file ? (
              <div>
                <p className="text-sm font-medium text-brand-navy">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Clique para selecionar ou arraste o arquivo aqui
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, JPG ou PNG (max 10MB)
                </p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_EXTENSIONS}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              Tipo de documento <span className="text-red-600">*</span>
            </Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposDocumento.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nome do documento</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Preenchido automaticamente pelo nome do arquivo"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={enviando || !file}
              className="bg-brand-navy hover:bg-brand-navy/90"
            >
              {enviando ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
