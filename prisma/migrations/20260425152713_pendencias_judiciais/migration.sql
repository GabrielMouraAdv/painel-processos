-- AlterTable
ALTER TABLE "Processo" ADD COLUMN     "dataDespacho" TIMESTAMP(3),
ADD COLUMN     "despachadoComRelator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memorialPronto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retornoDespacho" TEXT;
