import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AppShell } from "@/components/app-shell";
import { authOptions } from "@/lib/auth";
import { diasUteisEntre } from "@/lib/dias-uteis";
import { podeAcessarFinanceiro } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";
import { endOfWeekUTC, startOfWeekUTC } from "@/lib/semana";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const escritorioId = session.user.escritorioId;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em7 = new Date(hoje);
  em7.setDate(em7.getDate() + 7);
  em7.setHours(23, 59, 59, 999);

  // Margem generosa para filtrar no banco (15 dias corridos cobre 7 uteis + feriados)
  const em15Corridos = new Date(hoje);
  em15Corridos.setDate(em15Corridos.getDate() + 15);
  em15Corridos.setHours(23, 59, 59, 999);

  const semanaStart = startOfWeekUTC(new Date());
  const semanaEnd = endOfWeekUTC(semanaStart);

  const fimHoje = new Date(hoje);
  fimHoje.setHours(23, 59, 59, 999);

  const [
    prazosUrgentes,
    prazosTceCandidatos,
    processosTceTotal,
    pautasJudiciaisTotal,
    movsNaoLidas,
    pubsNaoLidas,
    despachosTcePendentes,
    compromissosHojeCount,
    prazosJudHojeCount,
    prazosTceHojeCount,
  ] = await Promise.all([
    prisma.prazo.count({
      where: {
        cumprido: false,
        dispensado: false,
        data: { gte: hoje, lte: em7 },
        processo: { escritorioId },
      },
    }),
    prisma.prazoTce.findMany({
      where: {
        cumprido: false,
        dispensado: false,
        dataVencimento: { gte: hoje, lte: em15Corridos },
        processo: { escritorioId },
      },
      select: { dataVencimento: true },
    }),
    prisma.processoTce.count({ where: { escritorioId } }),
    prisma.itemPautaJudicial.count({
      where: {
        sessao: {
          escritorioId,
          tribunal: "TJPE",
          data: { gte: semanaStart, lte: semanaEnd },
        },
      },
    }),
    prisma.movimentacaoAutomatica.count({
      where: { lida: false, processo: { escritorioId } },
    }),
    prisma.publicacaoDJEN.count({
      where: { lida: false, processo: { escritorioId } },
    }),
    prisma.processoTce.count({
      where: {
        escritorioId,
        julgado: false,
        despachadoComRelator: false,
        despachoDispensado: false,
        tipo: {
          notIn: ["TERMO_AJUSTE_GESTAO", "PEDIDO_RESCISAO", "CONSULTA"],
        },
        OR: [
          { despachoAgendadoData: { not: null } },
          { memorialPronto: true },
          {
            prazos: {
              some: {
                cumprido: false,
                dispensado: false,
                tipo: { contains: "despacho", mode: "insensitive" },
              },
            },
          },
        ],
      },
    }),
    prisma.compromisso.count({
      where: {
        escritorioId,
        advogadoId: session.user.id,
        cumprido: false,
        dataInicio: { gte: hoje, lte: fimHoje },
      },
    }),
    prisma.prazo.count({
      where: {
        cumprido: false,
        dispensado: false,
        data: { gte: hoje, lte: fimHoje },
        advogadoRespId: session.user.id,
        processo: { escritorioId },
      },
    }),
    prisma.prazoTce.count({
      where: {
        cumprido: false,
        dispensado: false,
        dataVencimento: { gte: hoje, lte: fimHoje },
        advogadoRespId: session.user.id,
        processo: { escritorioId },
      },
    }),
  ]);

  const compromissosHoje =
    compromissosHojeCount + prazosJudHojeCount + prazosTceHojeCount;

  const prazosTceUrgentes = prazosTceCandidatos.filter(
    (p) => diasUteisEntre(hoje, p.dataVencimento) <= 7,
  ).length;

  return (
    <AppShell
      prazosUrgentes={prazosUrgentes}
      prazosTceUrgentes={prazosTceUrgentes}
      processosTceTotal={processosTceTotal}
      pautasJudiciaisTotal={pautasJudiciaisTotal}
      alertasMonitoramento={movsNaoLidas + pubsNaoLidas}
      despachosTcePendentes={despachosTcePendentes}
      compromissosHoje={compromissosHoje}
      podeFinanceiro={podeAcessarFinanceiro(
        session.user.role,
        session.user.bancaSlug ?? null,
      )}
      isAdmin={session.user.role === "ADMIN"}
    >
      {children}
    </AppShell>
  );
}
