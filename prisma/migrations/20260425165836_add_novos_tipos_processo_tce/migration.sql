-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoProcessoTce" ADD VALUE 'TOMADA_CONTAS_ESPECIAL';
ALTER TYPE "TipoProcessoTce" ADD VALUE 'DESTAQUE';
ALTER TYPE "TipoProcessoTce" ADD VALUE 'DENUNCIA';
ALTER TYPE "TipoProcessoTce" ADD VALUE 'TERMO_AJUSTE_GESTAO';
ALTER TYPE "TipoProcessoTce" ADD VALUE 'PEDIDO_RESCISAO';
ALTER TYPE "TipoProcessoTce" ADD VALUE 'CONSULTA';
