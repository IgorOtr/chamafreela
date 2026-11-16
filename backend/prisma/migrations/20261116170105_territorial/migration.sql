-- CreateTable
CREATE TABLE "Municipality" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT 'RJ',
    "centerLat" DOUBLE PRECISION,
    "centerLng" DOUBLE PRECISION,
    "geojson" JSONB,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "TerritorialIndicator" (
    "id" TEXT NOT NULL,
    "municipalityCode" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "dimension" TEXT NOT NULL DEFAULT '',
    "dimensionLabel" TEXT,
    "label" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "scale" TEXT NOT NULL DEFAULT 'Município',
    "methodology" TEXT NOT NULL,
    "limitations" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TerritorialIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Municipality_name_idx" ON "Municipality"("name");

-- CreateIndex
CREATE INDEX "TerritorialIndicator_municipalityCode_key_idx" ON "TerritorialIndicator"("municipalityCode", "key");

-- CreateIndex
CREATE UNIQUE INDEX "TerritorialIndicator_municipalityCode_key_dimension_period_key" ON "TerritorialIndicator"("municipalityCode", "key", "dimension", "period");

-- AddForeignKey
ALTER TABLE "TerritorialIndicator" ADD CONSTRAINT "TerritorialIndicator_municipalityCode_fkey" FOREIGN KEY ("municipalityCode") REFERENCES "Municipality"("code") ON DELETE CASCADE ON UPDATE CASCADE;
