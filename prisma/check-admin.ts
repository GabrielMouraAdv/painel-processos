import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ log: ["error", "warn", "info"] });

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "admin@escritorio.com" },
  });
  if (!user) { console.log("ADMIN NAO ENCONTRADO"); return; }
  console.log("Admin encontrado:");
  console.log("  email:", user.email);
  console.log("  role:", user.role);
  console.log("  escritorioId:", user.escritorioId);
  console.log("  senha 'admin123' bate?", await bcrypt.compare("admin123", user.senha));

  const totais = {
    escritorios: await prisma.escritorio.count(),
    users: await prisma.user.count(),
    gestores: await prisma.gestor.count(),
    processos: await prisma.processo.count(),
  };
  console.log("Totais:", totais);
}

main()
  .catch((e) => { console.error("ERRO:", e.message.split("\n").slice(-3).join(" | ")); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
