-- AlterTable
ALTER TABLE "Processo" ADD COLUMN     "bancasSlug" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bancaSlug" TEXT;
