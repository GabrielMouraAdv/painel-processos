import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Senhas simplificadas dos acessos do modulo eleitoral: <nome>2026
const SENHAS: Record<string, string> = {
  "gabriel@eleitoral2026.com": "gabriel2026",
  "heloisa@eleitoral2026.com": "heloisa2026",
  "paulo@eleitoral2026.com": "paulo2026",
  "julio@eleitoral2026.com": "julio2026",
  "mateus@eleitoral2026.com": "mateus2026",
};

async function main() {
  for (const [email, senhaPlain] of Object.entries(SENHAS)) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`NAO ENCONTRADO: ${email}`);
      continue;
    }
    const senha = await bcrypt.hash(senhaPlain, 10);
    await prisma.user.update({ where: { id: user.id }, data: { senha } });
    console.log(`SENHA ATUALIZADA: ${email}`);
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
