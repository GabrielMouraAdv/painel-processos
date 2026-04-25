-- AlterTable
ALTER TABLE "Gestor" ADD COLUMN     "email" TEXT,
ADD COLUMN     "telefone" TEXT,
ALTER COLUMN "cpf" DROP NOT NULL;
