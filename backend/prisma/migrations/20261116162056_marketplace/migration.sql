-- CreateEnum
CREATE TYPE "ProfessionalStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'OCULTO');

-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('PRESENCIAL', 'REMOTO', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGEM', 'VIDEO');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('ATUALIZACAO', 'EXCLUSAO');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('ABERTA', 'CONCLUIDA');

-- CreateTable
CREATE TABLE "Professional" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "headline" TEXT,
    "description" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT,
    "mode" "AttendanceMode" NOT NULL DEFAULT 'PRESENCIAL',
    "radiusKm" INTEGER NOT NULL DEFAULT 10,
    "whatsapp" TEXT NOT NULL,
    "showContact" BOOLEAN NOT NULL DEFAULT false,
    "otherContacts" TEXT,
    "experience" TEXT,
    "qualifications" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "preferences" TEXT,
    "status" "ProfessionalStatus" NOT NULL DEFAULT 'PENDENTE',
    "rejectionReason" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Professional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceInfo" TEXT,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceArea" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT,
    "radiusKm" INTEGER NOT NULL DEFAULT 10,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "location" geography(Point,4326) GENERATED ALWAYS AS (CASE WHEN "lat" IS NOT NULL AND "lng" IS NOT NULL THEN ST_SetSRID(ST_MakePoint("lng","lat"),4326)::geography END) STORED,

    CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGEM',
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DataRequestType" NOT NULL,
    "message" TEXT,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'ABERTA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Professional_userId_key" ON "Professional"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Professional_slug_key" ON "Professional"("slug");

-- CreateIndex
CREATE INDEX "Professional_status_featured_idx" ON "Professional"("status", "featured");

-- CreateIndex
CREATE INDEX "Professional_categoryId_idx" ON "Professional"("categoryId");

-- CreateIndex
CREATE INDEX "Professional_city_idx" ON "Professional"("city");

-- CreateIndex
CREATE INDEX "Service_professionalId_idx" ON "Service"("professionalId");

-- CreateIndex
CREATE INDEX "Service_name_idx" ON "Service"("name");

-- CreateIndex
CREATE INDEX "ServiceArea_professionalId_idx" ON "ServiceArea"("professionalId");

-- CreateIndex
CREATE INDEX "ServiceArea_city_idx" ON "ServiceArea"("city");

-- CreateIndex
CREATE INDEX "PortfolioItem_professionalId_idx" ON "PortfolioItem"("professionalId");

-- CreateIndex
CREATE INDEX "DataRequest_status_idx" ON "DataRequest"("status");

-- AddForeignKey
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Professional" ADD CONSTRAINT "Professional_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceArea" ADD CONSTRAINT "ServiceArea_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ServiceArea_location_idx" ON "ServiceArea" USING GIST ("location");
