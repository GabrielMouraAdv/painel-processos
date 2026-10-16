-- AlterTable
ALTER TABLE "InteressadoProcessoTce" ADD COLUMN     "ehCliente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resultadoIndividual" TEXT,
ADD COLUMN     "valorDevolucao" DECIMAL(15,2),
ADD COLUMN     "valorMulta" DECIMAL(15,2);

