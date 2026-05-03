-- CreateTable
CREATE TABLE "LogAuditoria" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "descricao" TEXT NOT NULL,
    "detalhes" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogAuditoria_createdAt_idx" ON "LogAuditoria"("createdAt");

-- CreateIndex
CREATE INDEX "LogAuditoria_userId_idx" ON "LogAuditoria"("userId");

-- CreateIndex
CREATE INDEX "LogAuditoria_acao_idx" ON "LogAuditoria"("acao");

-- CreateIndex
CREATE INDEX "LogAuditoria_entidade_idx" ON "LogAuditoria"("entidade");

-- AddForeignKey
ALTER TABLE "LogAuditoria" ADD CONSTRAINT "LogAuditoria_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
