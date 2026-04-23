import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";

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
        include: { advogadoRedator: { select: { id: true, nome: true } } },
      },
    },
  });

  if (!processo) notFound();

  const [gestores, advogados] = await Promise.all([
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
      advogadoRedator: p.advogadoRedator
        ? { id: p.advogadoRedator.id, nome: p.advogadoRedator.nome }
        : null,
    })),
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:px-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/app/processos">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para processos
        </Link>
      </Button>

      <ProcessoView processo={detail} gestores={gestores} advogados={advogados} />
    </div>
  );
}
