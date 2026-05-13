import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DADOS = {
  nome: "Julia Dubeux Agra de Souza Ramos",
  email: "julia@escritorio.com",
  senhaPlain: "julia2026",
  role: Role.ADVOGADO,
  bancaSlug: "filipe-campos",
};

async function main() {
  const existente = await prisma.user.findUnique({
    where: { email: DADOS.email },
  });
  if (existente) {
    console.log(
      `JA EXISTE: ${existente.id} | ${existente.email} | ${existente.nome} | role=${existente.role} | bancaSlug=${existente.bancaSlug ?? "(null)"}`,
    );
    console.log("Nada a fazer. Saindo sem duplicar.");
    return;
  }

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
  if (!admin) {
    throw new Error("Nenhum usuario ADMIN encontrado para registrar o log de auditoria.");
  }

  const senhaHash = await bcrypt.hash(DADOS.senhaPlain, 10);

  const novo = await prisma.user.create({
    data: {
      nome: DADOS.nome,
      email: DADOS.email,
      senha: senhaHash,
      role: DADOS.role,
      bancaSlug: DADOS.bancaSlug,
      escritorioId: escritorio.id,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      userId: admin.id,
      acao: "CRIAR_USUARIO",
      entidade: "User",
      entidadeId: novo.id,
      descricao: `ADMIN criou novo usuario ${DADOS.nome}`,
      detalhes: JSON.stringify({
        email: DADOS.email,
        role: DADOS.role,
        bancaSlug: DADOS.bancaSlug,
        ativo: true,
      }),
    },
  });

  console.log("Criado com sucesso:");
  console.log(`  id:         ${novo.id}`);
  console.log(`  nome:       ${novo.nome}`);
  console.log(`  email:      ${novo.email}`);
  console.log(`  role:       ${novo.role}`);
  console.log(`  bancaSlug:  ${novo.bancaSlug}`);
  console.log(`  escritorio: ${escritorio.id}`);
  console.log(
    `Log de auditoria registrado por admin ${admin.email} (${admin.id}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
