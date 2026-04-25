-- AlterTable
ALTER TABLE "Prazo" ADD COLUMN     "dispensado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dispensadoEm" TIMESTAMP(3),
ADD COLUMN     "dispensadoMotivo" TEXT,
ADD COLUMN     "dispensadoPor" TEXT;

-- AlterTable
ALTER TABLE "PrazoSubprocessoTce" ADD COLUMN     "dispensado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dispensadoEm" TIMESTAMP(3),
ADD COLUMN     "dispensadoMotivo" TEXT,
ADD COLUMN     "dispensadoPor" TEXT;

-- AlterTable
ALTER TABLE "PrazoTce" ADD COLUMN     "dispensado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dispensadoEm" TIMESTAMP(3),
ADD COLUMN     "dispensadoMotivo" TEXT,
ADD COLUMN     "dispensadoPor" TEXT;
