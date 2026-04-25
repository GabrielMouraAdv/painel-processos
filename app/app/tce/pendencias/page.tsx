import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { diasUteisEntre } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import {
  agregarPendencias,
  detectarPendencias,
  type ProcessoComPendencias,
} from "@/lib/tce-pendencias";

import { PendenciasView } from "./pendencias-view";

export default async function PendenciasTcePage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em15Corridos = new Date(hoje);
  em15Corridos.setDate(em15Corridos.getDate() + 15);
  em15Corridos.setHours(23, 59, 59, 999);

  const [processos, advogados] = await Promise.all([
    prisma.processoTce.findMany({
      where: { escritorioId },
      orderBy: [{ dataAutuacao: "desc" }],
      include: {
        municipio: { select: { nome: true, uf: true } },
        andamentos: { select: { data: true, descricao: true } },
        prazos: {
          where: {
            dispensado: false,
            OR: [
              {
                cumprido: false,
                dataVencimento: { lte: em15Corridos },
              },
              { cumprido: true },
            ],
          },
          orderBy: { dataVencimento: "asc" },
          select: {
            id: true,
            tipo: true,
            dataVencimento: true,
            cumprido: true,
            advogadoResp: { select: { nome: true } },
          },
        },
        subprocessos: {
          include: {
            prazos: {
              where: {
                dispensado: false,
                OR: [
                  {
                    cumprido: false,
                    dataVencimento: { lte: em15Corridos },
                  },
                  { cumprido: true },
                ],
              },
              orderBy: { dataVencimento: "asc" },
              select: {
                id: true,
                tipo: true,
                dataVencimento: true,
                cumprido: true,
                advogadoRespId: true,
              },
            },
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

  // Advogados responsaveis dos prazos de subprocesso (sem relation no schema)
  const advRespIdsSub = Array.from(
    new Set(
      processos
        .flatMap((p) => p.subprocessos)
        .flatMap((sp) => sp.prazos)
        .map((pr) => pr.advogadoRespId)
        .filter((id): id is string => !!id),
    ),
  );
  const advsSubMap = advRespIdsSub.length
    ? new Map(
        (
          await prisma.user.findMany({
            where: { id: { in: advRespIdsSub } },
            select: { id: true, nome: true },
          })
        ).map((u) => [u.id, u.nome]),
      )
    : new Map<string, string>();

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

  const cards: ProcessoComPendencias[] = processos
    .map((p) => {
      // Inclui prazos do processo + prazos de todos os subprocessos
      const todosPrazos = [
        ...p.prazos.map((pr) => ({
          id: pr.id,
          tipo: pr.tipo,
          dataVencimento: pr.dataVencimento,
          cumprido: pr.cumprido,
          advogadoResp: pr.advogadoResp?.nome ?? null,
        })),
        ...p.subprocessos.flatMap((sp) =>
          sp.prazos.map((pr) => ({
            id: `sub-${pr.id}`,
            tipo: `${pr.tipo} (${sp.numero})`,
            dataVencimento: pr.dataVencimento,
            cumprido: pr.cumprido,
            advogadoResp: pr.advogadoRespId
              ? advsSubMap.get(pr.advogadoRespId) ?? null
              : null,
          })),
        ),
      ];

      // Filtra prazos vencendo em 7 dias uteis ou que ja foram cumpridos
      const prazosFiltrados = todosPrazos
        .map((pr) => ({
          id: pr.id,
          tipo: pr.tipo,
          dataVencimento: pr.dataVencimento,
          cumprido: pr.cumprido,
          advogadoResp: pr.advogadoResp,
          diasRestantes: diasUteisEntre(hoje, pr.dataVencimento),
        }))
        .filter(
          (pr) =>
            pr.cumprido ||
            (pr.diasRestantes <= 7 && pr.diasRestantes >= -30),
        );

      const pendencias = detectarPendencias(
        {
          id: p.id,
          tipo: p.tipo,
          notaTecnica: p.notaTecnica,
          parecerMpco: p.parecerMpco,
          memorialPronto: p.memorialPronto,
          despachadoComRelator: p.despachadoComRelator,
          contrarrazoesNtApresentadas: p.contrarrazoesNtApresentadas,
          contrarrazoesMpcoApresentadas: p.contrarrazoesMpcoApresentadas,
          faseAtual: p.faseAtual,
          memorialAgendadoData: p.memorialAgendadoData,
          memorialAgendadoAdvogadoNome: p.memorialAgendadoAdvogadoId
            ? advsAgendamentoMap.get(p.memorialAgendadoAdvogadoId) ?? null
            : null,
          despachoAgendadoData: p.despachoAgendadoData,
          despachoAgendadoAdvogadoNome: p.despachoAgendadoAdvogadoId
            ? advsAgendamentoMap.get(p.despachoAgendadoAdvogadoId) ?? null
            : null,
          memorialDispensado: p.memorialDispensado,
          memorialDispensadoPor: p.memorialDispensadoPor,
          memorialDispensadoEm: p.memorialDispensadoEm,
          memorialDispensadoMotivo: p.memorialDispensadoMotivo,
          despachoDispensado: p.despachoDispensado,
          despachoDispensadoPor: p.despachoDispensadoPor,
          despachoDispensadoEm: p.despachoDispensadoEm,
          despachoDispensadoMotivo: p.despachoDispensadoMotivo,
        },
        p.andamentos,
        prazosFiltrados,
      );

      return {
        id: p.id,
        numero: p.numero,
        tipo: p.tipo,
        camara: p.camara,
        exercicio: p.exercicio,
        faseAtual: p.faseAtual,
        relator: p.relator,
        municipio: p.municipio,
        notaTecnica: p.notaTecnica,
        parecerMpco: p.parecerMpco,
        memorialPronto: p.memorialPronto,
        despachadoComRelator: p.despachadoComRelator,
        contrarrazoesNtApresentadas: p.contrarrazoesNtApresentadas,
        contrarrazoesMpcoApresentadas: p.contrarrazoesMpcoApresentadas,
        memorialDispensado: p.memorialDispensado,
        despachoDispensado: p.despachoDispensado,
        pendencias,
      };
    })
    .filter((p) => p.pendencias.length > 0);

  const agregado = agregarPendencias(cards);

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
