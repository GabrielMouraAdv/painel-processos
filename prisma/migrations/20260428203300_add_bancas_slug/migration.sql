-- AlterTable
ALTER TABLE "ProcessoTce" ADD COLUMN     "bancasSlug" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "SubprocessoTce" ADD COLUMN     "bancasSlug" TEXT[] DEFAULT ARRAY[]::TEXT[];
