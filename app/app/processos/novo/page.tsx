import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { ProcessoForm } from "../processo-form";
import { PaginaCabecalho } from "@/components/pagina-cabecalho";

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
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-3 py-4 sm:px-6 sm:py-8 md:px-8">
      <PaginaCabecalho
        compacto
        secao="Judicial"
        titulo="Novo processo"
        descricao="Preencha os dados para registrar um novo processo no escritório."
        acoes={
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/processos">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar para processos
            </Link>
          </Button>
        }
      />

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
