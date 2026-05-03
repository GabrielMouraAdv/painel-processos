"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ChevronLeft, ChevronRight, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type LogRow = {
  id: string;
  createdAt: string;
  usuario: string;
  usuarioEmail: string;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  descricao: string;
};

type Props = {
  logs: LogRow[];
  total: number;
  page: number;
  totalPages: number;
  usuarios: { id: string; nome: string }[];
  acoes: string[];
  entidades: string[];
  filtros: {
    usuario: string;
    acao: string;
    entidade: string;
    de: string;
    ate: string;
  };
};

function corDaAcao(acao: string): string {
  const u = acao.toUpperCase();
  if (u.startsWith("CRIAR") || u.startsWith("CADASTRAR") || u.startsWith("UPLOAD") || u.startsWith("VINCULAR") || u.startsWith("GERAR")) {
    return "bg-green-100 text-green-800";
  }
  if (u.startsWith("EDITAR") || u.startsWith("ALTERAR") || u.startsWith("RENOVAR") || u.startsWith("PRORROGAR") || u.startsWith("INCLUIR")) {
    return "bg-blue-100 text-blue-800";
  }
  if (u.startsWith("EXCLUIR") || u.startsWith("DESVINCULAR")) {
    return "bg-red-100 text-red-800";
  }
  if (u.startsWith("LOGIN_FALHA")) {
    return "bg-red-100 text-red-800";
  }
  if (u.startsWith("LOGIN")) {
    return "bg-slate-100 text-slate-700";
  }
  if (u.startsWith("MARCAR") || u.startsWith("CUMPRIR") || u.startsWith("REGISTRAR") || u.startsWith("DUPLICAR")) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (u.startsWith("DISPENSAR")) {
    return "bg-yellow-100 text-yellow-800";
  }
  return "bg-slate-100 text-slate-700";
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${ano} ${h}:${m}`;
}

export function LogsView({
  logs,
  total,
  page,
  totalPages,
  usuarios,
  acoes,
  entidades,
  filtros,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [usuario, setUsuario] = React.useState(filtros.usuario);
  const [acao, setAcao] = React.useState(filtros.acao);
  const [entidade, setEntidade] = React.useState(filtros.entidade);
  const [de, setDe] = React.useState(filtros.de);
  const [ate, setAte] = React.useState(filtros.ate);

  function aplicarFiltros() {
    const params = new URLSearchParams();
    if (usuario) params.set("usuario", usuario);
    if (acao) params.set("acao", acao);
    if (entidade) params.set("entidade", entidade);
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    router.push(`/app/admin/logs?${params.toString()}`);
  }

  function limparFiltros() {
    setUsuario("");
    setAcao("");
    setEntidade("");
    setDe("");
    setAte("");
    router.push("/app/admin/logs");
  }

  function irParaPagina(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/app/admin/logs?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-6 py-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-navy/10 text-brand-navy">
          <History className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-brand-navy">
            Log de Auditoria
          </h1>
          <p className="text-sm text-slate-500">
            Registro de todas as movimentacoes do sistema
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="text-xs">Usuario</Label>
            <select
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Tipo de acao</Label>
            <select
              value={acao}
              onChange={(e) => setAcao(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">Todas</option>
              {acoes.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Entidade</Label>
            <select
              value={entidade}
              onChange={(e) => setEntidade(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">Todas</option>
              {entidades.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Ate</Label>
            <Input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="mt-1 h-9"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={limparFiltros}>
              Limpar
            </Button>
            <Button size="sm" onClick={aplicarFiltros}>
              Aplicar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-slate-500">
        {total === 0
          ? "Nenhum registro encontrado"
          : `${total} registro${total === 1 ? "" : "s"} - pagina ${page} de ${totalPages}`}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">
                  Data/Hora
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700">
                  Usuario
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">
                  Acao
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700">
                  Descricao
                </th>
                <th className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">
                  Entidade
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    Nenhum log para os filtros aplicados.
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap font-mono text-xs">
                    {formatarDataHora(log.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-slate-800">
                    <div>{log.usuario}</div>
                    <div className="text-xs text-slate-400">{log.usuarioEmail}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                        corDaAcao(log.acao),
                      )}
                    >
                      {log.acao}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{log.descricao}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {log.entidade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => irParaPagina(page - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
          </Button>
          <span className="text-sm text-slate-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => irParaPagina(page + 1)}
          >
            Proxima <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
