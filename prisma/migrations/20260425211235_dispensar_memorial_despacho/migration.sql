-- AlterTable
ALTER TABLE "Processo" ADD COLUMN     "despachoDispensado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "despachoDispensadoEm" TIMESTAMP(3),
ADD COLUMN     "despachoDispensadoMotivo" TEXT,
ADD COLUMN     "despachoDispensadoPor" TEXT,
ADD COLUMN     "memorialDispensado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memorialDispensadoEm" TIMESTAMP(3),
ADD COLUMN     "memorialDispensadoMotivo" TEXT,
ADD COLUMN     "memorialDispensadoPor" TEXT;

-- AlterTable
ALTER TABLE "ProcessoTce" ADD COLUMN     "despachoDispensado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "despachoDispensadoEm" TIMESTAMP(3),
ADD COLUMN     "despachoDispensadoMotivo" TEXT,
ADD COLUMN     "despachoDispensadoPor" TEXT,
ADD COLUMN     "memorialDispensado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memorialDispensadoEm" TIMESTAMP(3),
ADD COLUMN     "memorialDispensadoMotivo" TEXT,
ADD COLUMN     "memorialDispensadoPor" TEXT;

-- AlterTable
ALTER TABLE "SubprocessoTce" ADD COLUMN     "despachoDispensado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "despachoDispensadoEm" TIMESTAMP(3),
ADD COLUMN     "despachoDispensadoMotivo" TEXT,
ADD COLUMN     "despachoDispensadoPor" TEXT,
ADD COLUMN     "memorialDispensado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memorialDispensadoEm" TIMESTAMP(3),
ADD COLUMN     "memorialDispensadoMotivo" TEXT,
ADD COLUMN     "memorialDispensadoPor" TEXT;
