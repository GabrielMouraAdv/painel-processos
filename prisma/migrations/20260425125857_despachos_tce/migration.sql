-- AlterTable
ALTER TABLE "ProcessoTce" ADD COLUMN     "dataDespacho" TIMESTAMP(3),
ADD COLUMN     "incluidoNoDespacho" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prognosticoDespacho" TEXT,
ADD COLUMN     "retornoDespacho" TEXT;
