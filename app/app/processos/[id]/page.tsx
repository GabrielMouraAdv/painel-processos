import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { ProcessoView, type ProcessoDetail } from "./processo-view";

export default async function ProcessoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const processo = await prisma.processo.findFirst({
    where: { id: params.id, escritorioId },
    include: {
      gestor: true,
      advogado: { select: { id: true, nome: true, email: true } },
      andamentos: {
        orderBy: { data: "desc" },
        include: { autor: { select: { nome: true } } },
      },
      prazos: {
        orderBy: { data: "asc" },
        include: { advogadoResp: { select: { id: true, nome: true } } },
      },
      documentos: {
        orderBy: { createdAt: "desc" },
        include: { uploadedByUser: { select: { nome: true } } },
      },
      monitoramento: true,
      movimentacoesAuto: {
        orderBy: { dataMovimento: "desc" },
        take: 10,
      },
      publicacoesDjen: {
        orderBy: { dataPublicacao: "desc" },
        take: 10,
      },
    },
  });

  if (!processo) notFound();

  const itensPauta = await prisma.itemPautaJudicial.findMany({
    where: { processoId: processo.id },
    orderBy: { sessao: { data: "desc" } },
    include: {
      sessao: {
        select: {
          id: true,
          data: true,
          tribunal: true,
          orgaoJulgador: true,
          tipoSessao: true,
        },
      },
    },
  });

  const [gestores, advogados, advogadosResponsaveis] = await Promise.all([
    prisma.gestor.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, cargo: true, municipio: true },
    }),
    prisma.user.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, email: true },
    }),
    prisma.user.findMany({
      where: { escritorioId, role: Role.ADVOGADO },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  const detail: ProcessoDetail = {
    id: processo.id,
    numero: processo.numero,
    tipo: processo.tipo,
    tribunal: processo.tribunal,
    juizo: processo.juizo,
    grau: processo.grau,
    fase: processo.fase,
    resultado: processo.resultado,
    risco: processo.risco,
    valor: processo.valor ? Number(processo.valor) : null,
    dataDistribuicao: processo.dataDistribuicao.toISOString(),
    objeto: processo.objeto,
    gestorId: processo.gestorId,
    advogadoId: processo.advogadoId,
    createdAt: processo.createdAt.toISOString(),
    updatedAt: processo.updatedAt.toISOString(),
    gestor: {
      id: processo.gestor.id,
      nome: processo.gestor.nome,
      cargo: processo.gestor.cargo,
      observacoes: processo.gestor.observacoes,
    },
    advogado: processo.advogado,
    andamentos: processo.andamentos.map((a) => ({
      id: a.id,
      data: a.data.toISOString(),
      grau: a.grau,
      fase: a.fase,
      resultado: a.resultado,
      texto: a.texto,
      autor: a.autor,
    })),
    prazos: processo.prazos.map((p) => ({
      id: p.id,
      tipo: p.tipo,
      data: p.data.toISOString(),
      hora: p.hora,
      observacoes: p.observacoes,
      cumprido: p.cumprido,
      geradoAuto: p.geradoAuto,
      origemFase: p.origemFase,
      advogadoResp: p.advogadoResp
        ? { id: p.advogadoResp.id, nome: p.advogadoResp.nome }
        : null,
    })),
    historicoPauta: itensPauta.map((it) => ({
      id: it.id,
      data: it.sessao.data.toISOString(),
      tribunal: it.sessao.tribunal,
      orgaoJulgador: it.sessao.orgaoJulgador,
      tipoSessao: it.sessao.tipoSessao,
      relator: it.relator,
      situacao: it.situacao,
      retiradoDePauta: it.retiradoDePauta,
      pedidoVistas: it.pedidoVistas,
    })),
    documentos: processo.documentos.map((d) => ({
      id: d.id,
      nome: d.nome,
      url: d.url,
      tipo: d.tipo,
      tamanho: d.tamanho,
      createdAt: d.createdAt.toISOString(),
      uploadedByNome: d.uploadedByUser.nome,
    })),
    monitoramento: {
      ativo: processo.monitoramento?.monitoramentoAtivo ?? false,
      ultimaVerificacao:
        processo.monitoramento?.ultimaVerificacao?.toISOString() ?? null,
      ultimoErro: processo.monitoramento?.ultimoErro ?? null,
      movimentacoes: processo.movimentacoesAuto.map((m) => ({
        id: m.id,
        data: m.dataMovimento.toISOString(),
        nome: m.nomeMovimento,
        complementos: m.complementos,
        lida: m.lida,
      })),
      publicacoes: processo.publicacoesDjen.map((p) => ({
        id: p.id,
        data: p.dataPublicacao.toISOString(),
        conteudo: p.conteudo,
        caderno: p.caderno,
        pagina: p.pagina,
        lida: p.lida,
      })),
    },
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/app/processos">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para processos
        </Link>
      </Button>

      <ProcessoView
        processo={detail}
        gestores={gestores}
        advogados={advogados}
        advogadosResponsaveis={advogadosResponsaveis}
        canDeleteDocumentos={session!.user.role === Role.ADMIN}
      />
    </div>
  );
}
