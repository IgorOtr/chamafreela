-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('LEGENDA', 'PROMOCAO', 'ROTEIRO_VIDEO', 'ENQUETE', 'DESCRICAO_SERVICO', 'APRESENTACAO', 'CARTAO', 'POST', 'STORY', 'CALENDARIO');

-- CreateTable
CREATE TABLE "BrandKit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "tagline" TEXT,
    "segment" TEXT NOT NULL DEFAULT 'geral',
    "city" TEXT,
    "mainService" TEXT,
    "differentiator" TEXT,
    "contactLine" TEXT,
    "colors" JSONB NOT NULL,
    "fontKey" TEXT NOT NULL DEFAULT 'moderna',
    "logoConfig" JSONB NOT NULL,
    "logoSvg" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandKit_userId_key" ON "BrandKit"("userId");

-- CreateIndex
CREATE INDEX "MarketingAsset_userId_type_createdAt_idx" ON "MarketingAsset"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "BrandKit" ADD CONSTRAINT "BrandKit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingAsset" ADD CONSTRAINT "MarketingAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
