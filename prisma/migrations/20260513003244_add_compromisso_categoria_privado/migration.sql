-- AlterTable
ALTER TABLE "Compromisso" ADD COLUMN     "categoria" TEXT NOT NULL DEFAULT 'ESCRITORIO',
ADD COLUMN     "privado" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Compromisso_categoria_idx" ON "Compromisso"("categoria");

-- CreateIndex
CREATE INDEX "Compromisso_privado_idx" ON "Compromisso"("privado");
