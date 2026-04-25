-- AlterTable
ALTER TABLE "Processo" ADD COLUMN     "despachoAgendadoAdvogadoId" TEXT,
ADD COLUMN     "despachoAgendadoData" TIMESTAMP(3),
ADD COLUMN     "memorialAgendadoAdvogadoId" TEXT,
ADD COLUMN     "memorialAgendadoData" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ProcessoTce" ADD COLUMN     "despachoAgendadoAdvogadoId" TEXT,
ADD COLUMN     "despachoAgendadoData" TIMESTAMP(3),
ADD COLUMN     "memorialAgendadoAdvogadoId" TEXT,
ADD COLUMN     "memorialAgendadoData" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SubprocessoTce" ADD COLUMN     "despachoAgendadoAdvogadoId" TEXT,
ADD COLUMN     "despachoAgendadoData" TIMESTAMP(3),
ADD COLUMN     "memorialAgendadoAdvogadoId" TEXT,
ADD COLUMN     "memorialAgendadoData" TIMESTAMP(3);
