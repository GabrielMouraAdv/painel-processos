import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type Advogado = { nome: string; email: string };

const ADVOGADOS: Advogado[] = [
  { nome: "Gabriel Moura", email: "gabriel.moura@escritorio.com" },
  { nome: "Henrique Arruda", email: "henrique.arruda@escritorio.com" },
  { nome: "Heloisa Cavalcanti", email: "heloisa.cavalcanti@escritorio.com" },
  { nome: "Mateus Lisboa", email: "mateus.lisboa@escritorio.com" },
  { nome: "Filipe Campos", email: "filipe.campos@escritorio.com" },
  { nome: "Carlos Porto", email: "carlos.porto@escritorio.com" },
  { nome: "Julio Rodrigues", email: "julio.rodrigues@escritorio.com" },
];

async function main() {
  const escritorio = await prisma.escritorio.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!escritorio) {
    throw new Error(
      "Nenhum escritorio encontrado. Rode o seed principal primeiro.",
    );
  }

  const senhaHash = await bcrypt.hash("adv123", 10);

  for (const adv of ADVOGADOS) {
    const existente = await prisma.user.findUnique({
      where: { email: adv.email },
    });
    if (existente) {
      await prisma.user.update({
        where: { email: adv.email },
        data: {
          nome: adv.nome,
          role: Role.ADVOGADO,
          senha: senhaHash,
          escritorioId: escritorio.id,
        },
      });
      console.log(`Atualizado: ${adv.nome} (${adv.email})`);
    } else {
      await prisma.user.create({
        data: {
          nome: adv.nome,
          email: adv.email,
          senha: senhaHash,
          role: Role.ADVOGADO,
          escritorioId: escritorio.id,
        },
      });
      console.log(`Criado: ${adv.nome} (${adv.email})`);
    }
  }

  console.log(`\nTotal advogados ADVOGADO: ${await prisma.user.count({ where: { role: Role.ADVOGADO } })}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
