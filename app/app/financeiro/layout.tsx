import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { podeAcessarFinanceiro } from "@/lib/financeiro";

export default async function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) notFound();
  if (
    !podeAcessarFinanceiro(session.user.role, session.user.bancaSlug ?? null)
  ) {
    notFound();
  }
  return <>{children}</>;
}
