import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { detectaDecisao } from "@/lib/monitoramento-detect";
import { prisma } from "@/lib/prisma";

import { MonitoramentoClient } from "./monitoramento-client";

export default async function MonitoramentoPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const escritorioId = session.user.escritorioId;

  const [
    totalMonitorados,
    ultimaConfig,
    movimentacoesNaoLidas,
    publicacoesNaoLidas,
    processos,
  ] = await Promise.all([
    prisma.monitoramentoConfig.count({
      where: {
        monitoramentoAtivo: true,
        processo: { escritorioId },
      },
    }),
    prisma.monitoramentoConfig.findFirst({
      where: { processo: { escritorioId } },
      orderBy: { ultimaVerificacao: "desc" },
      select: { ultimaVerificacao: true },
    }),
    prisma.movimentacaoAutomatica.findMany({
      where: { lida: false, processo: { escritorioId } },
      orderBy: { dataMovimento: "desc" },
      include: {
        processo: {
          select: {
            id: true,
            numero: true,
            tribunal: true,
            gestor: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.publicacaoDJEN.findMany({
      where: { lida: false, processo: { escritorioId } },
      orderBy: { dataPublicacao: "desc" },
      include: {
        processo: {
          select: {
            id: true,
            numero: true,
            tribunal: true,
            gestor: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        numero: true,
        tribunal: true,
        gestor: { select: { nome: true } },
        monitoramento: {
          select: {
            monitoramentoAtivo: true,
            ultimaVerificacao: true,
            ultimoErro: true,
          },
        },
        _count: {
          select: {
            movimentacoesAuto: { where: { lida: false } },
            publicacoesDjen: { where: { lida: false } },
          },
        },
      },
    }),
  ]);

  const alertas = [
    ...movimentacoesNaoLidas.map((m) => ({
      id: m.id,
      tipo: "movimentacao" as const,
      data: m.dataMovimento.toISOString(),
      titulo: m.nomeMovimento,
      detalhe: m.complementos,
      ehDecisao: detectaDecisao(m.nomeMovimento),
      geraIntimacao: false,
      fonte: m.fonte,
      codigoMovimento: m.codigoMovimento,
      descricao: m.descricao,
      conteudoCompleto: null,
      caderno: null,
      pagina: null,
      dataDisponibilizacao: null,
      processo: {
        id: m.processo.id,
        numero: m.processo.numero,
        tribunal: m.processo.tribunal as string,
        gestor: m.processo.gestor.nome,
      },
    })),
    ...publicacoesNaoLidas.map((p) => ({
      id: p.id,
      tipo: "publicacao" as const,
      data: p.dataPublicacao.toISOString(),
      titulo: p.conteudo
        ? p.conteudo.length > 200
          ? p.conteudo.slice(0, 200) + "..."
          : p.conteudo
        : "Publicacao DJEN",
      detalhe:
        [p.caderno, p.pagina].filter(Boolean).join(" - ") || null,
      ehDecisao: false,
      geraIntimacao: p.geraIntimacao,
      fonte: p.fonte,
      codigoMovimento: null,
      descricao: null,
      conteudoCompleto: p.conteudo,
      caderno: p.caderno,
      pagina: p.pagina,
      dataDisponibilizacao: p.dataDisponibilizacao?.toISOString() ?? null,
      processo: {
        id: p.processo.id,
        numero: p.processo.numero,
        tribunal: p.processo.tribunal as string,
        gestor: p.processo.gestor.nome,
      },
    })),
  ].sort((a, b) => (a.data < b.data ? 1 : -1));

  const linhasProcessos = processos.map((p) => ({
    id: p.id,
    numero: p.numero,
    tribunal: p.tribunal as string,
    gestor: p.gestor.nome,
    monitoramentoAtivo: p.monitoramento?.monitoramentoAtivo ?? false,
    ultimaVerificacao: p.monitoramento?.ultimaVerificacao?.toISOString() ?? null,
    ultimoErro: p.monitoramento?.ultimoErro ?? null,
    novosAlertas:
      p._count.movimentacoesAuto + p._count.publicacoesDjen,
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy md:text-3xl">
          Monitoramento Automatico
        </h1>
        <p className="text-sm text-muted-foreground">Datajud + DJEN</p>
      </div>

      <MonitoramentoClient
        totalMonitorados={totalMonitorados}
        ultimaVerificacao={
          ultimaConfig?.ultimaVerificacao?.toISOString() ?? null
        }
        alertas={alertas}
        processos={linhasProcessos}
      />
    </div>
  );
}
