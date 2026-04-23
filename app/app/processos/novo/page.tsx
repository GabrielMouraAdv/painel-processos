import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { ProcessoForm } from "../processo-form";

export default async function NovoProcessoPage() {
  const session = await getServerSession(authOptions);
  const escritorioId = session!.user.escritorioId;

  const [gestores, advogados] = await Promise.all([
    prisma.gestor.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, cargo: true, municipio: true },
    }),
    prisma.user.findMany({
      where: { escritorioId },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, email: true },
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8 md:px-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link href="/app/processos">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar para processos
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-navy">
          Novo processo
        </h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados para registrar um novo processo no escritorio.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do processo</CardTitle>
        </CardHeader>
        <CardContent>
          <ProcessoForm
            mode="create"
            gestores={gestores}
            advogados={advogados}
          />
        </CardContent>
      </Card>
    </div>
  );
}
