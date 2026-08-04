import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Acessos exclusivos do modulo eleitoral: qualquer login com e-mail
// @eleitoral2026.com enxerga apenas o modulo eleitoral no painel.
const USUARIOS = [
  {
    nome: "Gabriel Vidal de Moura",
    email: "gabriel@eleitoral2026.com",
    senhaPlain: "gabriel#eleitoral26",
  },
  {
    nome: "Maria Heloisa Leal Cavalcanti",
    email: "heloisa@eleitoral2026.com",
    senhaPlain: "heloisa#eleitoral26",
  },
  {
    nome: "Paulo Roberto de Carvalho Maciel",
    email: "paulo@eleitoral2026.com",
    senhaPlain: "paulo#eleitoral26",
  },
  {
    nome: "Julio Tiago de C. Rodrigues",
    email: "julio@eleitoral2026.com",
    senhaPlain: "julio#eleitoral26",
  },
  {
    nome: "Mateus Lisboa",
    email: "mateus@eleitoral2026.com",
    senhaPlain: "mateus#eleitoral26",
  },
];

async function main() {
  const escritorio = await prisma.escritorio.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!escritorio) {
    throw new Error("Nenhum escritorio encontrado. Rode o seed principal antes.");
  }

  const admin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    orderBy: { createdAt: "asc" },
  });

  for (const dados of USUARIOS) {
    const existente = await prisma.user.findUnique({
      where: { email: dados.email },
    });
    if (existente) {
      console.log(`JA EXISTE: ${existente.email} (${existente.nome}) — pulando.`);
      continue;
    }

    const senhaHash = await bcrypt.hash(dados.senhaPlain, 10);
    const novo = await prisma.user.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senha: senhaHash,
        role: Role.ADVOGADO,
        escritorioId: escritorio.id,
      },
    });

    if (admin) {
      await prisma.logAuditoria.create({
        data: {
          userId: admin.id,
          acao: "CRIAR_USUARIO",
          entidade: "User",
          entidadeId: novo.id,
          descricao: `Criado usuario do modulo eleitoral ${dados.nome}`,
          detalhes: JSON.stringify({ email: dados.email, role: Role.ADVOGADO }),
        },
      });
    }

    console.log(`CRIADO: ${novo.email} (${novo.nome})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
