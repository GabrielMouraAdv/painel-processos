import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import {
  agregarPendenciasJud,
  detectarPendenciasJud,
  type ProcessoComPendenciasJud,
} from "@/lib/judicial-pendencias";
import { prisma } from "@/lib/prisma";

import { PendenciasView } from "./pendencias-view";

export default async function PendenciasJudiciaisPage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em15 = new Date(hoje);
  em15.setDate(em15.getDate() + 15);
  em15.setHours(23, 59, 59, 999);

  const [processos, advogados] = await Promise.all([
    prisma.processo.findMany({
      where: { escritorioId },
      orderBy: [{ dataDistribuicao: "desc" }],
      include: {
        gestor: { select: { id: true, nome: true } },
        advogado: { select: { id: true, nome: true } },
        prazos: {
          where: {
            OR: [{ cumprido: false, data: { lte: em15 } }, { cumprido: true }],
          },
          orderBy: { data: "asc" },
          select: {
            id: true,
            tipo: true,
            data: true,
            cumprido: true,
            advogadoResp: { select: { nome: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { escritorioId, role: Role.ADVOGADO },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  function diasCorridos(data: Date): number {
    const ref = new Date(data);
    ref.setHours(0, 0, 0, 0);
    return Math.round((ref.getTime() - hoje.getTime()) / 86_400_000);
  }

  const advAgendamentoIds = Array.from(
    new Set(
      processos
        .flatMap((p) => [
          p.memorialAgendadoAdvogadoId,
          p.despachoAgendadoAdvogadoId,
        ])
        .filter((id): id is string => !!id),
    ),
  );
  const advsAgendamentoMap = advAgendamentoIds.length
    ? new Map(
        (
          await prisma.user.findMany({
            where: { id: { in: advAgendamentoIds } },
            select: { id: true, nome: true },
          })
        ).map((u) => [u.id, u.nome]),
      )
    : new Map<string, string>();

  const cards: ProcessoComPendenciasJud[] = processos
    .map((p) => {
      const prazosFiltrados = p.prazos
        .map((pr) => ({
          id: pr.id,
          tipo: pr.tipo,
          data: pr.data,
          cumprido: pr.cumprido,
          advogadoResp: pr.advogadoResp?.nome ?? null,
          diasRestantes: diasCorridos(pr.data),
        }))
        .filter(
          (pr) =>
            pr.cumprido ||
            (pr.diasRestantes <= 7 && pr.diasRestantes >= -30),
        );

      const pendencias = detectarPendenciasJud(
        {
          id: p.id,
          fase: p.fase,
          grau: p.grau,
          memorialPronto: p.memorialPronto,
          despachadoComRelator: p.despachadoComRelator,
          memorialAgendadoData: p.memorialAgendadoData,
          memorialAgendadoAdvogadoNome: p.memorialAgendadoAdvogadoId
            ? advsAgendamentoMap.get(p.memorialAgendadoAdvogadoId) ?? null
            : null,
          despachoAgendadoData: p.despachoAgendadoData,
          despachoAgendadoAdvogadoNome: p.despachoAgendadoAdvogadoId
            ? advsAgendamentoMap.get(p.despachoAgendadoAdvogadoId) ?? null
            : null,
        },
        prazosFiltrados,
      );

      return {
        id: p.id,
        numero: p.numero,
        tipo: p.tipo,
        tipoLivre: p.tipoLivre,
        tribunal: p.tribunal,
        grau: p.grau,
        fase: p.fase,
        gestorNome: p.gestor.nome,
        advogadoNome: p.advogado.nome,
        advogadoId: p.advogado.id,
        memorialPronto: p.memorialPronto,
        despachadoComRelator: p.despachadoComRelator,
        pendencias,
      };
    })
    .filter((p) => p.pendencias.length > 0);

  const agregado = agregarPendenciasJud(cards);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
      <PendenciasView
        cards={cards}
        agregado={agregado}
        advogados={advogados}
      />
    </div>
  );
}
