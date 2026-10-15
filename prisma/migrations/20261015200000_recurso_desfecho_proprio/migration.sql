-- CreateEnum
CREATE TYPE "ResultadoRecursoTce" AS ENUM ('PROVIDO', 'PROVIDO_EM_PARTE', 'NAO_PROVIDO', 'NAO_CONHECIDO', 'PREJUDICADO');

-- AlterTable
ALTER TABLE "ProcessoTce" ADD COLUMN     "dataSessao" TIMESTAMP(3),
ADD COLUMN     "dataTransito" TIMESTAMP(3),
ADD COLUMN     "numeroAcordao" TEXT,
ADD COLUMN     "orgaoJulgador" "CamaraTce",
ADD COLUMN     "resultadoFinal" TEXT,
ADD COLUMN     "resultadoRecurso" "ResultadoRecursoTce";

