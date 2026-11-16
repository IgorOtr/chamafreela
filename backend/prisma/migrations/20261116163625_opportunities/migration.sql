-- Nota: o Prisma tenta mexer na coluna gerada "ServiceArea.location" (PostGIS); essas linhas foram removidas à mão.
-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ATIVA', 'SUSPENSA');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('PONTUAL', 'RECORRENTE', 'TEMPORARIO', 'VAGA_FIXA');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('PENDENTE', 'PUBLICADA', 'REJEITADA', 'ENCERRADA');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "legalName" TEXT,
    "cnpj" TEXT,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "responsibleName" TEXT NOT NULL,
    "responsibleRole" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ATIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT,
    "mode" "AttendanceMode" NOT NULL DEFAULT 'PRESENCIAL',
    "deadline" TIMESTAMP(3) NOT NULL,
    "contractType" "ContractType" NOT NULL,
    "requirements" TEXT,
    "payMin" INTEGER,
    "payMax" INTEGER,
    "contactChannel" TEXT NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'PENDENTE',
    "rejectionReason" TEXT,
    "flags" TEXT[],
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_userId_key" ON "Company"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

-- CreateIndex
CREATE INDEX "Opportunity_status_deadline_idx" ON "Opportunity"("status", "deadline");

-- CreateIndex
CREATE INDEX "Opportunity_categoryId_idx" ON "Opportunity"("categoryId");

-- CreateIndex
CREATE INDEX "Opportunity_companyId_idx" ON "Opportunity"("companyId");

-- CreateIndex
CREATE INDEX "Opportunity_city_idx" ON "Opportunity"("city");

-- CreateIndex
CREATE INDEX "Interest_professionalId_idx" ON "Interest"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_opportunityId_professionalId_key" ON "Interest"("opportunityId", "professionalId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
