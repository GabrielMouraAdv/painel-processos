-- CreateEnum
CREATE TYPE "StatusDeteccao" AS ENUM ('PENDENTE', 'CADASTRADO', 'DISPENSADO', 'OUTRO_ESCRITORIO');

-- CreateTable
CREATE TABLE "DeteccaoEleitoral" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "classe" TEXT,
    "parteAutora" TEXT,
    "parteRe" TEXT,
    "objeto" TEXT,
    "relator" TEXT,
    "orgao" TEXT,
    "fonte" TEXT NOT NULL DEFAULT 'PDPJ',
    "observacoes" TEXT,
    "status" "StatusDeteccao" NOT NULL DEFAULT 'PENDENTE',
    "processoId" TEXT,
    "escritorioResponsavel" TEXT,
    "motivoDispensa" TEXT,
    "resolvidoPorId" TEXT,
    "resolvidoEm" TIMESTAMP(3),
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeteccaoEleitoral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeteccaoEleitoral_numero_key" ON "DeteccaoEleitoral"("numero");

-- CreateIndex
CREATE INDEX "DeteccaoEleitoral_escritorioId_idx" ON "DeteccaoEleitoral"("escritorioId");

-- CreateIndex
CREATE INDEX "DeteccaoEleitoral_status_idx" ON "DeteccaoEleitoral"("status");

-- CreateIndex
CREATE INDEX "DeteccaoEleitoral_createdAt_idx" ON "DeteccaoEleitoral"("createdAt");

-- AddForeignKey
ALTER TABLE "DeteccaoEleitoral" ADD CONSTRAINT "DeteccaoEleitoral_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "ProcessoEleitoral"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeteccaoEleitoral" ADD CONSTRAINT "DeteccaoEleitoral_resolvidoPorId_fkey" FOREIGN KEY ("resolvidoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeteccaoEleitoral" ADD CONSTRAINT "DeteccaoEleitoral_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

