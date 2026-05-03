import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { ACOES, registrarLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          return null;
        }

        const emailNormalizado = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email: emailNormalizado },
        });

        if (!user) {
          return null;
        }

        const senhaValida = await bcrypt.compare(credentials.senha, user.senha);
        if (!senhaValida) {
          await registrarLog({
            userId: user.id,
            acao: ACOES.LOGIN_FALHA,
            entidade: "User",
            entidadeId: user.id,
            descricao: `Tentativa de login com senha invalida para ${emailNormalizado}`,
          });
          return null;
        }

        await registrarLog({
          userId: user.id,
          acao: ACOES.LOGIN,
          entidade: "User",
          entidadeId: user.id,
          descricao: `${user.nome} fez login no sistema`,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.nome,
          role: user.role,
          escritorioId: user.escritorioId,
          bancaSlug: user.bancaSlug,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.escritorioId = user.escritorioId;
        token.bancaSlug = user.bancaSlug;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.escritorioId = token.escritorioId as string;
        session.user.bancaSlug = (token.bancaSlug ?? null) as string | null;
      }
      return session;
    },
  },
};
