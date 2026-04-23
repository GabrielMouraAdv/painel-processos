import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { Sidebar } from "@/components/sidebar";
import { authOptions } from "@/lib/auth";
import { diasUteisEntre } from "@/lib/dias-uteis";
import { prisma } from "@/lib/prisma";

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

  const [prazosUrgentes, prazosTceCandidatos, processosTceTotal] =
    await Promise.all([
      prisma.prazo.count({
        where: {
          cumprido: false,
          data: { gte: hoje, lte: em7 },
          processo: { escritorioId },
        },
      }),
      prisma.prazoTce.findMany({
        where: {
          cumprido: false,
          dataVencimento: { gte: hoje, lte: em15Corridos },
          processo: { escritorioId },
        },
        select: { dataVencimento: true },
      }),
      prisma.processoTce.count({ where: { escritorioId } }),
    ]);

  const prazosTceUrgentes = prazosTceCandidatos.filter(
    (p) => diasUteisEntre(hoje, p.dataVencimento) <= 7,
  ).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        prazosUrgentes={prazosUrgentes}
        prazosTceUrgentes={prazosTceUrgentes}
        processosTceTotal={processosTceTotal}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
