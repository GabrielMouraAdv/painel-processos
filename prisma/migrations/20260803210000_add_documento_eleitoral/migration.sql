-- CreateTable
CREATE TABLE "DocumentoEleitoral" (
    "id" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'OUTRO',
    "nomeArquivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "observacoes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoEleitoral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoEleitoral_processoId_idx" ON "DocumentoEleitoral"("processoId");

-- CreateIndex
CREATE INDEX "DocumentoEleitoral_uploadedById_idx" ON "DocumentoEleitoral"("uploadedById");

-- AddForeignKey
ALTER TABLE "DocumentoEleitoral" ADD CONSTRAINT "DocumentoEleitoral_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "ProcessoEleitoral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoEleitoral" ADD CONSTRAINT "DocumentoEleitoral_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

