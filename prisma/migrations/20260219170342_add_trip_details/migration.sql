-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('MARINE', 'GROUP', 'INDIVIDUAL');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "route" TEXT,
ADD COLUMN     "route_ar" TEXT,
ADD COLUMN     "trip_type" "TripType";

-- CreateTable
CREATE TABLE "TripFeature" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "title_ar" TEXT,
    "description" TEXT,
    "description_ar" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TripFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripItineraryDay" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "day_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "title_ar" TEXT,
    "content" TEXT,
    "content_ar" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TripItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripMeal" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "day_number" INTEGER NOT NULL,
    "breakfast" TEXT,
    "breakfast_ar" TEXT,
    "lunch" TEXT,
    "lunch_ar" TEXT,
    "dinner" TEXT,
    "dinner_ar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TripMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripHotel" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "night_number" INTEGER NOT NULL,
    "hotel_name" TEXT NOT NULL,
    "hotel_name_ar" TEXT,
    "city" TEXT,
    "city_ar" TEXT,
    "category" TEXT,
    "option_number" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TripHotel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripFeature_trip_id_idx" ON "TripFeature"("trip_id");

-- CreateIndex
CREATE INDEX "TripItineraryDay_trip_id_idx" ON "TripItineraryDay"("trip_id");

-- CreateIndex
CREATE INDEX "TripMeal_trip_id_idx" ON "TripMeal"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "TripMeal_trip_id_day_number_key" ON "TripMeal"("trip_id", "day_number");

-- CreateIndex
CREATE INDEX "TripHotel_trip_id_idx" ON "TripHotel"("trip_id");

-- CreateIndex
CREATE INDEX "Trip_trip_type_idx" ON "Trip"("trip_type");

-- AddForeignKey
ALTER TABLE "TripFeature" ADD CONSTRAINT "TripFeature_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripItineraryDay" ADD CONSTRAINT "TripItineraryDay_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripMeal" ADD CONSTRAINT "TripMeal_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripHotel" ADD CONSTRAINT "TripHotel_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
