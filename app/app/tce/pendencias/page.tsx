import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { parseBancasParam } from "@/lib/bancas";
import { diasUteisEntre } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";
import {
  agregarPendencias,
  detectarPendencias,
  type ProcessoComPendencias,
} from "@/lib/tce-pendencias";

import { PendenciasView } from "./pendencias-view";

export default async function PendenciasTcePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;
  const bancasFiltro = parseBancasParam(searchParams.banca);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [processos, advogados] = await Promise.all([
    prisma.processoTce.findMany({
      where: {
        escritorioId,
        julgado: false,
        ...(bancasFiltro.length > 0 && {
          bancasSlug: { hasSome: bancasFiltro },
        }),
      },
      orderBy: [{ dataAutuacao: "desc" }],
      include: {
        municipio: { select: { nome: true, uf: true } },
        andamentos: { select: { data: true, descricao: true } },
        prazos: {
          where: { dispensado: false },
          orderBy: { dataVencimento: "asc" },
          select: {
            id: true,
            tipo: true,
            dataVencimento: true,
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
      const todosPrazos = p.prazos.map((pr) => ({
        id: pr.id,
        tipo: pr.tipo,
        dataVencimento: pr.dataVencimento,
        cumprido: pr.cumprido,
        advogadoResp: pr.advogadoResp?.nome ?? null,
      }));

      // Sinais explicitos de prazo em aberto (qualquer data) por categoria.
      const temPrazoMemorialAberto = todosPrazos.some(
        (pr) => !pr.cumprido && /memorial/i.test(pr.tipo),
      );
      const temPrazoDespachoAberto = todosPrazos.some(
        (pr) => !pr.cumprido && /despacho/i.test(pr.tipo),
      );

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
          contrarrazoesNtDispensadas: p.contrarrazoesNtDispensadas,
          contrarrazoesNtDispensadoPor: p.contrarrazoesNtDispensadoPor,
          contrarrazoesNtDispensadoEm: p.contrarrazoesNtDispensadoEm,
          contrarrazoesNtDispensadoMotivo: p.contrarrazoesNtDispensadoMotivo,
          contrarrazoesMpcoDispensadas: p.contrarrazoesMpcoDispensadas,
          contrarrazoesMpcoDispensadoPor: p.contrarrazoesMpcoDispensadoPor,
          contrarrazoesMpcoDispensadoEm: p.contrarrazoesMpcoDispensadoEm,
          contrarrazoesMpcoDispensadoMotivo:
            p.contrarrazoesMpcoDispensadoMotivo,
          temPrazoMemorialAberto,
          temPrazoDespachoAberto,
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
        bancasSlug: p.bancasSlug,
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <PendenciasView
        cards={cards}
        agregado={agregado}
        advogados={advogados}
      />
    </div>
  );
}
