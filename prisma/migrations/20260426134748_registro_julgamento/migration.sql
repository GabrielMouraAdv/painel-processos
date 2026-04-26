-- AlterTable
ALTER TABLE "Processo" ADD COLUMN     "dataJulgamento" TIMESTAMP(3),
ADD COLUMN     "julgado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "observacoesJulgamento" TEXT,
ADD COLUMN     "penalidade" TEXT,
ADD COLUMN     "resultadoJulgamento" TEXT,
ADD COLUMN     "valorCondenacao" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "ProcessoTce" ADD COLUMN     "dataJulgamento" TIMESTAMP(3),
ADD COLUMN     "julgado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "observacoesJulgamento" TEXT,
ADD COLUMN     "penalidade" TEXT,
ADD COLUMN     "resultadoJulgamento" TEXT,
ADD COLUMN     "valorDevolucao" DECIMAL(15,2),
ADD COLUMN     "valorMulta" DECIMAL(15,2);
