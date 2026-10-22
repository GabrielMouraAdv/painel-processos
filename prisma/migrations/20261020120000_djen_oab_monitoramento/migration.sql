-- AlterTable: PublicacaoDJEN
ALTER TABLE "PublicacaoDJEN" ADD COLUMN     "hashConteudo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "linkOficial" TEXT,
ADD COLUMN     "tipoComunicacao" TEXT;

-- Preenche o hash das publicacoes ja existentes
UPDATE "PublicacaoDJEN" SET "hashConteudo" = md5(COALESCE("conteudo", ''));

-- DropIndex (o indice unico com o texto integral nao comporta intimacoes longas)
DROP INDEX IF EXISTS "PublicacaoDJEN_processoId_dataPublicacao_conteudo_key";

-- CreateIndex
CREATE UNIQUE INDEX "PublicacaoDJEN_processoId_dataPublicacao_hashConteudo_key" ON "PublicacaoDJEN"("processoId", "dataPublicacao", "hashConteudo");

-- CreateIndex
CREATE INDEX "PublicacaoDJEN_fonte_dataPublicacao_idx" ON "PublicacaoDJEN"("fonte", "dataPublicacao");

-- AlterTable: MonitoramentoConfig
ALTER TABLE "MonitoramentoConfig" ADD COLUMN     "datajudAtualizadoEm" TIMESTAMP(3);
