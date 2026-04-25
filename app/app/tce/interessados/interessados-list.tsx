"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  Filter,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { iniciais } from "@/lib/iniciais";
import { cn } from "@/lib/utils";

import {
  InteressadoDialog,
  NovoInteressadoButton,
  type InteressadoFormInitial,
  type MunicipioOption,
} from "./interessado-dialog";

export type InteressadoCard = {
  id: string;
  tipoInteressado: "PESSOA_FISICA" | "PESSOA_JURIDICA";
  nome: string;
  cargo: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  municipio: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  cnpj: string | null;
  ramoAtividade: string | null;
  // Para PF: lista derivada do historico (compatibilidade)
  // Para PJ: lista vinda de GestorMunicipio
  municipiosLista: { id: string; nome: string; uf: string }[];
  totalProcessosTce: number;
};

const TODOS = "__todos__";

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function InteressadosList({
  interessados,
  municipios,
}: {
  interessados: InteressadoCard[];
  municipios: MunicipioOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editando, setEditando] = React.useState<InteressadoFormInitial | null>(
    null,
  );
  const [editOpen, setEditOpen] = React.useState(false);
  const [excluindo, setExcluindo] = React.useState<InteressadoCard | null>(
    null,
  );
  const [excluindoMsg, setExcluindoMsg] = React.useState<string | null>(null);
  const [excluindoBusy, setExcluindoBusy] = React.useState(false);

  const [busca, setBusca] = React.useState("");
  const [filtroMunicipio, setFiltroMunicipio] = React.useState<string>(TODOS);
  const [filtroTipo, setFiltroTipo] = React.useState<string>(TODOS);

  const filtrados = React.useMemo(() => {
    const q = normalizar(busca.trim());
    return interessados.filter((g) => {
      if (filtroTipo !== TODOS && g.tipoInteressado !== filtroTipo) return false;

      if (filtroMunicipio !== TODOS) {
        const muni = municipios.find((m) => m.id === filtroMunicipio);
        if (!muni) return false;
        if (g.tipoInteressado === "PESSOA_FISICA") {
          if (g.municipio !== muni.nome) return false;
        } else {
          if (!g.municipiosLista.some((m) => m.id === muni.id)) return false;
        }
      }

      if (q) {
        const haystack = [
          g.nome,
          g.cargo,
          g.razaoSocial ?? "",
          g.nomeFantasia ?? "",
          g.cnpj ?? "",
          g.cpf ?? "",
          g.municipio,
          g.municipiosLista.map((m) => m.nome).join(" "),
        ]
          .map(normalizar)
          .join(" ");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [interessados, busca, filtroMunicipio, filtroTipo, municipios]);

  function abrirEdicao(item: InteressadoCard) {
    setEditando({
      id: item.id,
      tipoInteressado: item.tipoInteressado,
      nome: item.nome,
      cpf: item.cpf ?? "",
      cargo: item.cargo,
      municipio: item.municipio,
      razaoSocial: item.razaoSocial ?? "",
      nomeFantasia: item.nomeFantasia ?? "",
      cnpj: item.cnpj ?? "",
      ramoAtividade: item.ramoAtividade ?? "",
      municipioIds: item.municipiosLista.map((m) => m.id),
      email: item.email ?? "",
      telefone: item.telefone ?? "",
      observacoes: item.observacoes ?? "",
    });
    setEditOpen(true);
  }

  function abrirExclusao(item: InteressadoCard) {
    setExcluindo(item);
    setExcluindoMsg(null);
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setExcluindoBusy(true);
    try {
      const res = await fetch(`/api/gestores/${excluindo.id}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExcluindoMsg(json.error ?? "Erro ao excluir.");
        return;
      }
      toast({ title: "Interessado excluido" });
      setExcluindo(null);
      router.refresh();
    } finally {
      setExcluindoBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tribunal de Contas
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-brand-navy">
            Interessados
          </h1>
          <p className="text-sm text-muted-foreground">
            {interessados.length} interessado
            {interessados.length === 1 ? "" : "s"} cadastrado
            {interessados.length === 1 ? "" : "s"}.
          </p>
        </div>
        <NovoInteressadoButton municipios={municipios} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, razao social, CPF/CNPJ..."
              className="pl-9"
            />
          </div>
          <div className="flex min-w-[180px] flex-col gap-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                <SelectItem value="PESSOA_FISICA">Pessoa Fisica</SelectItem>
                <SelectItem value="PESSOA_JURIDICA">
                  Pessoa Juridica
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-[220px] flex-col gap-1">
            <Label className="text-xs">Municipio</Label>
            <Select
              value={filtroMunicipio}
              onValueChange={setFiltroMunicipio}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos</SelectItem>
                {municipios.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}/{m.uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(busca || filtroMunicipio !== TODOS || filtroTipo !== TODOS) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBusca("");
                setFiltroMunicipio(TODOS);
                setFiltroTipo(TODOS);
              }}
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      {filtrados.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {interessados.length === 0
              ? "Nenhum interessado cadastrado ainda. Use o botao acima para comecar."
              : "Nenhum interessado bate com o filtro."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((g) => {
            const isPj = g.tipoInteressado === "PESSOA_JURIDICA";
            const municipiosTexto = isPj
              ? g.municipiosLista.map((m) => m.nome).join(", ")
              : g.municipio;
            return (
              <div key={g.id} className="relative">
                <Link href={`/app/tce/interessados/${g.id}`}>
                  <Card className="h-full cursor-pointer transition-all hover:shadow-md">
                    <CardContent className="flex flex-col gap-4 p-5 pr-12">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 bg-brand-navy/10">
                          <AvatarFallback className="bg-brand-navy/10 text-sm font-semibold text-brand-navy">
                            {iniciais(g.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-brand-navy">
                              {g.nome}
                            </h3>
                            <span
                              className={cn(
                                "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                isPj
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-blue-100 text-blue-700",
                              )}
                            >
                              {isPj ? "PJ" : "PF"}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {isPj
                              ? g.ramoAtividade || "Pessoa juridica"
                              : g.cargo}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-100 bg-slate-50 p-2 text-center">
                        <Stat
                          icon={<Building2 className="h-3.5 w-3.5" />}
                          label="Municipios"
                          value={
                            isPj ? g.municipiosLista.length : g.municipio ? 1 : 0
                          }
                        />
                        <Stat
                          icon={<FileText className="h-3.5 w-3.5" />}
                          label="Processos TCE"
                          value={g.totalProcessosTce}
                        />
                      </div>

                      {municipiosTexto && (
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {isPj ? "Atua em" : "Municipio"}
                          </p>
                          <p className="line-clamp-2 text-xs text-slate-700">
                            {municipiosTexto}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
                <div className="absolute right-3 top-3 flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      abrirEdicao(g);
                    }}
                    aria-label="Editar"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-brand-navy hover:text-brand-navy"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      abrirExclusao(g);
                    }}
                    aria-label="Excluir"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <InteressadoDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditando(null);
        }}
        initial={editando}
        municipios={municipios}
      />

      <Dialog
        open={!!excluindo}
        onOpenChange={(v) => {
          if (!v) {
            setExcluindo(null);
            setExcluindoMsg(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir interessado</DialogTitle>
            <DialogDescription>
              {excluindo
                ? `Confirma a exclusao de ${excluindo.nome}? Essa acao nao pode ser desfeita.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {excluindoMsg && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {excluindoMsg}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setExcluindo(null);
                setExcluindoMsg(null);
              }}
              disabled={excluindoBusy}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarExclusao}
              disabled={excluindoBusy}
            >
              {excluindoBusy ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-lg font-semibold text-brand-navy">{value}</p>
      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
    </div>
  );
}
