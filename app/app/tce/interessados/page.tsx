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
        municipiosAtuacao: {
          include: { municipio: { select: { id: true, nome: true, uf: true } } },
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
    tipoInteressado: g.tipoInteressado,
    nome: g.nome,
    cargo: g.cargo,
    cpf: g.cpf,
    email: g.email,
    telefone: g.telefone,
    observacoes: g.observacoes,
    municipio: g.municipio,
    razaoSocial: g.razaoSocial,
    nomeFantasia: g.nomeFantasia,
    cnpj: g.cnpj,
    ramoAtividade: g.ramoAtividade,
    municipiosLista: g.municipiosAtuacao.map((mm) => ({
      id: mm.municipio.id,
      nome: mm.municipio.nome,
      uf: mm.municipio.uf,
    })),
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
