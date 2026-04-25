-- AlterTable
ALTER TABLE "ProcessoTce" ADD COLUMN     "contrarrazoesMpcoDispensadas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contrarrazoesMpcoDispensadoEm" TIMESTAMP(3),
ADD COLUMN     "contrarrazoesMpcoDispensadoMotivo" TEXT,
ADD COLUMN     "contrarrazoesMpcoDispensadoPor" TEXT,
ADD COLUMN     "contrarrazoesNtDispensadas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contrarrazoesNtDispensadoEm" TIMESTAMP(3),
ADD COLUMN     "contrarrazoesNtDispensadoMotivo" TEXT,
ADD COLUMN     "contrarrazoesNtDispensadoPor" TEXT;
