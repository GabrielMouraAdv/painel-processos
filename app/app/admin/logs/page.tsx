import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { LogsView } from "./logs-view";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== Role.ADMIN) redirect("/app");

  const escritorioId = session.user.escritorioId;
  const usuario = asString(searchParams.usuario);
  const acao = asString(searchParams.acao);
  const entidade = asString(searchParams.entidade);
  const de = asString(searchParams.de);
  const ate = asString(searchParams.ate);
  const pageRaw = parseInt(asString(searchParams.page) || "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const where: Record<string, unknown> = {
    user: { escritorioId },
  };
  if (usuario) where.userId = usuario;
  if (acao) where.acao = acao;
  if (entidade) where.entidade = entidade;
  if (de || ate) {
    const range: { gte?: Date; lte?: Date } = {};
    if (de) {
      const d = new Date(de);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(0, 0, 0, 0);
        range.gte = d;
      }
    }
    if (ate) {
      const d = new Date(ate);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        range.lte = d;
      }
    }
    if (range.gte || range.lte) where.createdAt = range;
  }

  const [total, logs, usuarios, acoesDistintas, entidadesDistintas] =
    await Promise.all([
      prisma.logAuditoria.count({ where }),
      prisma.logAuditoria.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          user: { select: { id: true, nome: true, email: true } },
        },
      }),
      prisma.user.findMany({
        where: { escritorioId },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      }),
      prisma.logAuditoria.findMany({
        where: { user: { escritorioId } },
        distinct: ["acao"],
        select: { acao: true },
        orderBy: { acao: "asc" },
      }),
      prisma.logAuditoria.findMany({
        where: { user: { escritorioId } },
        distinct: ["entidade"],
        select: { entidade: true },
        orderBy: { entidade: "asc" },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Estatisticas DJEN do escritorio
  const processoWhere = { processo: { escritorioId } };
  const [
    djenDisponivel,
    djenIndisponivel,
    djenErro,
    djenNuncaBuscado,
  ] = await Promise.all([
    prisma.movimentacaoAutomatica.count({
      where: { ...processoWhere, conteudoIntegralStatus: "DISPONIVEL" },
    }),
    prisma.movimentacaoAutomatica.count({
      where: { ...processoWhere, conteudoIntegralStatus: "INDISPONIVEL" },
    }),
    prisma.movimentacaoAutomatica.count({
      where: { ...processoWhere, conteudoIntegralStatus: "ERRO_BUSCA" },
    }),
    prisma.movimentacaoAutomatica.count({
      where: { ...processoWhere, conteudoIntegralStatus: null },
    }),
  ]);
  const djenBuscados = djenDisponivel + djenIndisponivel + djenErro;
  const djenTaxaSucesso =
    djenBuscados > 0 ? Math.round((djenDisponivel / djenBuscados) * 100) : 0;

  const djenErrosRecentes = await prisma.movimentacaoAutomatica.findMany({
    where: { ...processoWhere, conteudoIntegralStatus: "ERRO_BUSCA" },
    orderBy: { conteudoIntegralBuscadoEm: "desc" },
    take: 10,
    select: {
      id: true,
      nomeMovimento: true,
      dataMovimento: true,
      conteudoIntegralBuscadoEm: true,
      processo: { select: { numero: true } },
    },
  });

  const djenStats = {
    disponivel: djenDisponivel,
    indisponivel: djenIndisponivel,
    erro: djenErro,
    nuncaBuscado: djenNuncaBuscado,
    taxaSucesso: djenTaxaSucesso,
    errosRecentes: djenErrosRecentes.map((e) => ({
      id: e.id,
      processo: e.processo.numero,
      nome: e.nomeMovimento,
      dataMovimento: e.dataMovimento.toISOString(),
      buscadoEm: e.conteudoIntegralBuscadoEm?.toISOString() ?? null,
    })),
  };

  return (
    <LogsView
      logs={logs.map((l) => ({
        id: l.id,
        createdAt: l.createdAt.toISOString(),
        usuario: l.user.nome,
        usuarioEmail: l.user.email,
        acao: l.acao,
        entidade: l.entidade,
        entidadeId: l.entidadeId,
        descricao: l.descricao,
      }))}
      total={total}
      page={page}
      totalPages={totalPages}
      usuarios={usuarios}
      acoes={acoesDistintas.map((a) => a.acao)}
      entidades={entidadesDistintas.map((e) => e.entidade)}
      filtros={{ usuario, acao, entidade, de, ate }}
      djenStats={djenStats}
    />
  );
}
