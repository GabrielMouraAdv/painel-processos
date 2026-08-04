import { anoMesBrasil, dataInputUTC } from "@/lib/eleitoral-labels";
import {
  exigirPaginaEleitoral,
  listarUsuariosEleitoral,
} from "@/lib/eleitoral-server";
import { prisma } from "@/lib/prisma";

import { CalendarioEleitoralView } from "./calendario-view";

export const dynamic = "force-dynamic";

function parseMes(raw: string | undefined): { ano: number; mes: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(raw ?? "");
  if (m) {
    const ano = Number(m[1]);
    const mes = Number(m[2]) - 1;
    if (mes >= 0 && mes <= 11) return { ano, mes };
  }
  return anoMesBrasil();
}

export default async function EleitoralCalendarioPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await exigirPaginaEleitoral();
  const escritorioId = session.user.escritorioId;

  const { ano, mes } = parseMes(
    typeof searchParams.mes === "string" ? searchParams.mes : undefined,
  );

  const inicioMes = new Date(Date.UTC(ano, mes, 1));
  const fimMes = new Date(Date.UTC(ano, mes + 1, 0, 23, 59, 59, 999));

  const [prazos, processos, usuarios] = await Promise.all([
    prisma.prazoEleitoral.findMany({
      where: {
        data: { gte: inicioMes, lte: fimMes },
        processo: { escritorioId },
      },
      orderBy: { data: "asc" },
      include: {
        processo: { select: { id: true, numero: true, apelido: true } },
        responsavel: { select: { id: true, nome: true } },
      },
    }),
    prisma.processoEleitoral.findMany({
      where: { escritorioId },
      orderBy: { createdAt: "desc" },
      select: { id: true, numero: true, apelido: true },
    }),
    listarUsuariosEleitoral(escritorioId),
  ]);

  return (
    <CalendarioEleitoralView
      ano={ano}
      mes={mes}
      prazos={prazos.map((p) => ({
        id: p.id,
        tarefa: p.tarefa,
        data: dataInputUTC(p.data),
        hora: p.hora,
        status: p.status,
        observacoes: p.observacoes,
        responsavel: p.responsavel,
        processo: p.processo,
      }))}
      processos={processos}
      usuarios={usuarios}
      usuarioAtualId={session.user.id}
    />
  );
}
