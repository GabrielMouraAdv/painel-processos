import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  InteressadosList,
  type InteressadoCard,
} from "./interessados-list";

export default async function TceInteressadosPage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const [gestores, municipios] = await Promise.all([
    prisma.gestor.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      include: {
        historicoGestoes: {
          orderBy: { dataInicio: "desc" },
          include: { municipio: { select: { nome: true, uf: true } } },
        },
        _count: { select: { interessadoProcessosTce: true } },
      },
    }),
    prisma.municipio.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, uf: true },
    }),
  ]);

  const interessados: InteressadoCard[] = gestores.map((g) => ({
    id: g.id,
    nome: g.nome,
    cargo: g.cargo,
    cpf: g.cpf,
    email: g.email,
    telefone: g.telefone,
    observacoes: g.observacoes,
    municipio: g.municipio,
    municipiosVinculados: Array.from(
      new Set(g.historicoGestoes.map((h) => h.municipio.nome)),
    ),
    totalProcessosTce: g._count.interessadoProcessosTce,
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 md:px-8">
      <InteressadosList
        interessados={interessados}
        municipios={municipios}
      />
    </div>
  );
}
