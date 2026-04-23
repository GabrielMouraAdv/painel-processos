-- CreateTable
CREATE TABLE "DocumentoTce" (
    "id" TEXT NOT NULL,
    "processoTceId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoTce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoTce_processoTceId_idx" ON "DocumentoTce"("processoTceId");

-- CreateIndex
CREATE INDEX "DocumentoTce_uploadedBy_idx" ON "DocumentoTce"("uploadedBy");

-- AddForeignKey
ALTER TABLE "DocumentoTce" ADD CONSTRAINT "DocumentoTce_processoTceId_fkey" FOREIGN KEY ("processoTceId") REFERENCES "ProcessoTce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoTce" ADD CONSTRAINT "DocumentoTce_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
