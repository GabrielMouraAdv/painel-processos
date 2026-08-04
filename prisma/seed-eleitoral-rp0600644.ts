import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NUMERO = "0600644-03.2026.6.17.0000";

async function main() {
  const escritorio = await prisma.escritorio.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!escritorio) throw new Error("Nenhum escritorio encontrado.");

  const existente = await prisma.processoEleitoral.findUnique({
    where: { numero: NUMERO },
  });
  if (existente) {
    console.log(`JA EXISTE: ${NUMERO} (id ${existente.id}). Saindo.`);
    return;
  }

  const paulo = await prisma.user.findUnique({
    where: { email: "paulo@eleitoral2026.com" },
    select: { id: true },
  });

  const processo = await prisma.processoEleitoral.create({
    data: {
      numero: NUMERO,
      classe: "REPRESENTACAO",
      apelido: "Imagem Raquel com Clarissa Tercio",
      parteAutora: "PSD",
      parteRe: "Marcelo Diniz e outros",
      polo: "PASSIVO",
      objeto:
        "Propaganda negativa – Desinformacao – Postagem – imagem Raquel com Clarissa Tercio, Gilson Machado e Eduardo Moura",
      relator: "Fernando Braga Damasceno",
      coordenadorId: paulo?.id ?? null,
      escritorioId: escritorio.id,
    },
  });
  console.log(`Processo criado: ${processo.id}`);

  const prazo = await prisma.prazoEleitoral.create({
    data: {
      processoId: processo.id,
      tarefa: "Defesa",
      data: new Date("2026-08-04T00:00:00.000Z"),
      responsavelId: paulo?.id ?? null,
      observacoes: "Coordenador: Paulo.",
    },
  });
  console.log(`Prazo criado: Defesa em 04/08/2026 (id ${prazo.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
