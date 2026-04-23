import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { Sidebar } from "@/components/sidebar";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em7 = new Date(hoje);
  em7.setDate(em7.getDate() + 7);
  em7.setHours(23, 59, 59, 999);

  const prazosUrgentes = await prisma.prazo.count({
    where: {
      cumprido: false,
      data: { gte: hoje, lte: em7 },
      processo: { escritorioId: session.user.escritorioId },
    },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar prazosUrgentes={prazosUrgentes} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
