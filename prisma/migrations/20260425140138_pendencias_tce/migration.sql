-- AlterTable
ALTER TABLE "ProcessoTce" ADD COLUMN     "contrarrazoesMpcoApresentadas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contrarrazoesNtApresentadas" BOOLEAN NOT NULL DEFAULT false;
