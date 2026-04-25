import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { MunicipiosList, type MunicipioCard } from "./municipios-list";

export default async function TceMunicipiosPage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const municipios = await prisma.municipio.findMany({
    where: { escritorioId },
    orderBy: { nome: "asc" },
    include: {
      _count: {
        select: { processosTce: true, gestoes: true },
      },
    },
  });

  const cards: MunicipioCard[] = municipios.map((m) => ({
    id: m.id,
    nome: m.nome,
    uf: m.uf,
    cnpjPrefeitura: m.cnpjPrefeitura,
    observacoes: m.observacoes,
    totalProcessosTce: m._count.processosTce,
    totalGestoes: m._count.gestoes,
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <MunicipiosList municipios={cards} />
    </div>
  );
}
