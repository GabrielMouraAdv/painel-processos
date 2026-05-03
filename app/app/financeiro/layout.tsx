import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { Lock } from "lucide-react";

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
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Lock className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold text-brand-navy">
          Acesso restrito
        </h1>
        <p className="text-sm text-muted-foreground">
          Voce nao tem permissao para acessar o modulo financeiro. Caso precise
          de acesso, fale com o administrador do sistema.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
