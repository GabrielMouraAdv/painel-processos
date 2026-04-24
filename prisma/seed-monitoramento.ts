import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const processos = await prisma.processo.findMany({
    orderBy: { createdAt: "asc" },
    take: 5,
    select: { id: true, numero: true },
  });

  if (processos.length === 0) {
    console.log("Nenhum processo encontrado. Rode 'npm run prisma:seed' antes.");
    return;
  }

  let criados = 0;
  let atualizados = 0;

  for (const p of processos) {
    const existente = await prisma.monitoramentoConfig.findUnique({
      where: { processoId: p.id },
      select: { id: true },
    });

    await prisma.monitoramentoConfig.upsert({
      where: { processoId: p.id },
      create: {
        processoId: p.id,
        monitoramentoAtivo: true,
        ultimaVerificacao: null,
        totalVerificacoes: 0,
      },
      update: {
        monitoramentoAtivo: true,
      },
    });

    if (existente) atualizados++;
    else criados++;

    console.log(`[ok] monitoramento ativo para ${p.numero}`);
  }

  console.log(
    `Seed monitoramento concluido. Criados: ${criados}. Atualizados: ${atualizados}.`,
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
