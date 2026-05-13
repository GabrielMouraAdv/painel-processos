-- CreateTable
CREATE TABLE "IntencaoTelegram" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "dadosBrutos" TEXT NOT NULL,
    "mensagemOriginal" TEXT NOT NULL,
    "duvidaAtual" TEXT,
    "expirado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntencaoTelegram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntencaoTelegram_userId_idx" ON "IntencaoTelegram"("userId");

-- CreateIndex
CREATE INDEX "IntencaoTelegram_estado_idx" ON "IntencaoTelegram"("estado");

-- CreateIndex
CREATE INDEX "IntencaoTelegram_createdAt_idx" ON "IntencaoTelegram"("createdAt");

-- AddForeignKey
ALTER TABLE "IntencaoTelegram" ADD CONSTRAINT "IntencaoTelegram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
