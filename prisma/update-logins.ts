import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type LoginConfig = {
  emailAtual: string;
  emailNovo: string;
  nome: string;
  role: Role;
  senha: string;
};

const LOGINS: LoginConfig[] = [
  {
    emailAtual: "gabriel.moura@escritorio.com",
    emailNovo: "gabriel@escritorio.com",
    nome: "Gabriel Vidal de Moura",
    role: Role.ADMIN,
    senha: "gabriel2026",
  },
  {
    emailAtual: "filipe.campos@escritorio.com",
    emailNovo: "filipe@escritorio.com",
    nome: "Filipe Fernandes Campos",
    role: Role.ADVOGADO,
    senha: "filipe2026",
  },
  {
    emailAtual: "carlos.porto@escritorio.com",
    emailNovo: "carlos@escritorio.com",
    nome: "Carlos Porto de Barros",
    role: Role.ADVOGADO,
    senha: "carlos2026",
  },
  {
    emailAtual: "julio.rodrigues@escritorio.com",
    emailNovo: "julio@escritorio.com",
    nome: "Julio Tiago de C. Rodrigues",
    role: Role.ADVOGADO,
    senha: "julio2026",
  },
  {
    emailAtual: "mateus.lisboa@escritorio.com",
    emailNovo: "mateus@escritorio.com",
    nome: "Mateus Lisboa",
    role: Role.ADVOGADO,
    senha: "mateus2026",
  },
  {
    emailAtual: "henrique.arruda@escritorio.com",
    emailNovo: "henrique@escritorio.com",
    nome: "Henrique Arruda",
    role: Role.ADVOGADO,
    senha: "henrique2026",
  },
];

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@escritorio.com" },
  });
  if (!admin) {
    console.warn("AVISO: usuario admin@escritorio.com nao encontrado");
  } else {
    console.log("admin@escritorio.com mantido como ADMIN");
  }

  for (const login of LOGINS) {
    const senhaHash = await bcrypt.hash(login.senha, 10);

    const existente = await prisma.user.findUnique({
      where: { email: login.emailAtual },
    });

    if (existente) {
      const conflito =
        login.emailAtual !== login.emailNovo
          ? await prisma.user.findUnique({ where: { email: login.emailNovo } })
          : null;
      if (conflito && conflito.id !== existente.id) {
        console.error(
          `ERRO: ${login.emailNovo} ja existe em outro usuario (${conflito.id}). Pulando ${login.emailAtual}.`,
        );
        continue;
      }

      await prisma.user.update({
        where: { id: existente.id },
        data: {
          email: login.emailNovo,
          nome: login.nome,
          role: login.role,
          senha: senhaHash,
        },
      });
      console.log(
        `Atualizado: ${existente.id} | ${login.emailAtual} -> ${login.emailNovo} | ${login.nome} | ${login.role}`,
      );
    } else {
      const jaNovo = await prisma.user.findUnique({
        where: { email: login.emailNovo },
      });
      if (jaNovo) {
        await prisma.user.update({
          where: { id: jaNovo.id },
          data: {
            nome: login.nome,
            role: login.role,
            senha: senhaHash,
          },
        });
        console.log(
          `Atualizado (ja com email novo): ${jaNovo.id} | ${login.emailNovo} | ${login.nome} | ${login.role}`,
        );
      } else {
        console.warn(
          `AVISO: nenhum usuario encontrado para ${login.emailAtual} nem ${login.emailNovo}`,
        );
      }
    }
  }

  const total = await prisma.user.count();
  console.log(`\nTotal de usuarios apos update: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
