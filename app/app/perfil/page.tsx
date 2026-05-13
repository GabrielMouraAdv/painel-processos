import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Mail, ShieldCheck, User } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { AlterarSenhaButton } from "./alterar-senha-button";
import { TelegramSection } from "./telegram-section";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  ADVOGADO: "Advogado",
  SECRETARIA: "Secretaria",
  LEITURA: "Leitura",
};

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      createdAt: true,
      escritorio: { select: { nome: true } },
      telegramAtivo: true,
      telegramBotUsername: true,
      telegramReceberLembreteDiario: true,
      telegramHorarioLembreteManha: true,
      telegramHorarioLembreteTarde: true,
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-brand-navy">Meu Perfil</h1>
        <p className="text-sm text-slate-500">
          Visualize seus dados de acesso e altere sua senha.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
              <User className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nome
              </p>
              <p className="text-sm text-slate-900">{user.nome}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </p>
              <p className="text-sm text-slate-900">{user.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Perfil de acesso
              </p>
              <p className="text-sm text-slate-900">
                {ROLE_LABEL[user.role] ?? user.role}
              </p>
            </div>
          </div>

          {user.escritorio?.nome && (
            <div className="border-t pt-4 text-xs text-slate-500">
              Escritorio: {user.escritorio.nome}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-navy">Senha</p>
            <p className="text-xs text-slate-500">
              Recomendamos trocar a senha periodicamente. Minimo de 6 caracteres.
            </p>
          </div>
          <AlterarSenhaButton />
        </CardContent>
      </Card>

      <TelegramSection
        initial={{
          telegramAtivo: user.telegramAtivo,
          telegramBotUsername: user.telegramBotUsername,
          telegramReceberLembreteDiario: user.telegramReceberLembreteDiario,
          telegramHorarioLembreteManha: user.telegramHorarioLembreteManha,
          telegramHorarioLembreteTarde: user.telegramHorarioLembreteTarde,
        }}
      />
    </div>
  );
}
