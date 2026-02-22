-- CreateEnum
CREATE TYPE "CarCategory" AS ENUM ('ECONOMY', 'SUV', 'LUXURY', 'VAN');

-- CreateEnum
CREATE TYPE "CarTransmission" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "CarFuelType" AS ENUM ('PETROL', 'DIESEL');

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "category" "CarCategory" NOT NULL DEFAULT 'ECONOMY',
ADD COLUMN     "fuel_type" "CarFuelType",
ADD COLUMN     "seats" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "transmission" "CarTransmission" NOT NULL DEFAULT 'AUTOMATIC';

-- CreateIndex
CREATE INDEX "Car_category_idx" ON "Car"("category");

-- CreateIndex
CREATE INDEX "Car_transmission_idx" ON "Car"("transmission");
