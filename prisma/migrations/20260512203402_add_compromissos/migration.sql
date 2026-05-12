-- CreateTable
CREATE TABLE "Compromisso" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
    "cor" TEXT,
    "tipo" TEXT NOT NULL,
    "local" TEXT,
    "cumprido" BOOLEAN NOT NULL DEFAULT false,
    "advogadoId" TEXT NOT NULL,
    "processoTceId" TEXT,
    "processoId" TEXT,
    "escritorioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compromisso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Compromisso_escritorioId_idx" ON "Compromisso"("escritorioId");

-- CreateIndex
CREATE INDEX "Compromisso_advogadoId_idx" ON "Compromisso"("advogadoId");

-- CreateIndex
CREATE INDEX "Compromisso_dataInicio_idx" ON "Compromisso"("dataInicio");

-- CreateIndex
CREATE INDEX "Compromisso_processoTceId_idx" ON "Compromisso"("processoTceId");

-- CreateIndex
CREATE INDEX "Compromisso_processoId_idx" ON "Compromisso"("processoId");

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_advogadoId_fkey" FOREIGN KEY ("advogadoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_processoTceId_fkey" FOREIGN KEY ("processoTceId") REFERENCES "ProcessoTce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "Processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
