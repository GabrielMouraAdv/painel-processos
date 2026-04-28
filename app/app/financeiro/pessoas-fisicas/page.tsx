import { getServerSession } from "next-auth";
import { TipoHonorario } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { parseBancasParam } from "@/lib/bancas";
import { ANOS_DISPONIVEIS } from "@/lib/financeiro";
import { prisma } from "@/lib/prisma";

import { PessoasFisicasView, type HonorarioRow } from "./pessoas-fisicas-view";

function asString(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

export default async function PessoasFisicasPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const session = await getServerSession(authOptions);
  void session;

  const anoParam = parseInt(asString(searchParams.ano), 10);
  const ano = ANOS_DISPONIVEIS.includes(anoParam) ? anoParam : 0;
  const bancasFiltro = parseBancasParam(searchParams.banca);
  const tipoParam = asString(searchParams.tipo) as TipoHonorario | "";
  const status = asString(searchParams.status);

  const tipoVal = (Object.values(TipoHonorario) as string[]).includes(tipoParam)
    ? (tipoParam as TipoHonorario)
    : undefined;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const honorarios = await prisma.honorarioPessoal.findMany({
    where: {
      ...(bancasFiltro.length > 0 && {
        bancasSlug: { hasSome: bancasFiltro },
      }),
      ...(tipoVal && { tipoHonorario: tipoVal }),
      ...(ano && {
        dataContrato: {
          gte: new Date(Date.UTC(ano, 0, 1)),
          lt: new Date(Date.UTC(ano + 1, 0, 1)),
        },
      }),
      ...(status === "pago" && { pago: true }),
      ...(status === "aberto" && { pago: false }),
      ...(status === "vencido" && {
        pago: false,
        dataVencimento: { lt: hoje },
      }),
    },
    orderBy: [{ dataContrato: "desc" }],
  });

  const rows: HonorarioRow[] = honorarios.map((h) => ({
    id: h.id,
    clienteNome: h.clienteNome,
    clienteCpf: h.clienteCpf,
    bancasSlug: h.bancasSlug,
    tipoHonorario: h.tipoHonorario,
    descricaoCausa: h.descricaoCausa,
    valorTotal: Number(h.valorTotal),
    dataContrato: h.dataContrato.toISOString(),
    dataVencimento: h.dataVencimento ? h.dataVencimento.toISOString() : null,
    pago: h.pago,
    dataPagamento: h.dataPagamento ? h.dataPagamento.toISOString() : null,
    valorPago: h.valorPago ? Number(h.valorPago) : null,
    observacoes: h.observacoes,
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <PessoasFisicasView
        honorarios={rows}
        initialFilters={{
          ano: ano ? String(ano) : "",
          tipo: tipoVal ?? "",
          status,
        }}
      />
    </div>
  );
}
