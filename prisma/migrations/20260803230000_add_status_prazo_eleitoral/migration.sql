-- CreateEnum
CREATE TYPE "StatusPrazoEleitoral" AS ENUM ('PENDENTE', 'IMPORTANTE', 'EM_ELABORACAO', 'CUMPRIDO', 'PERDIDO', 'DISPENSADO');

-- AlterTable
ALTER TABLE "PrazoEleitoral" ADD COLUMN     "status" "StatusPrazoEleitoral" NOT NULL DEFAULT 'PENDENTE';

