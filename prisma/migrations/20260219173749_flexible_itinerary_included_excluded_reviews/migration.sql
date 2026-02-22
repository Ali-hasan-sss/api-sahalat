-- AlterTable
ALTER TABLE "TripItineraryDay" ADD COLUMN     "duration" TEXT,
ADD COLUMN     "duration_ar" TEXT,
ADD COLUMN     "extra_info" TEXT,
ADD COLUMN     "extra_info_ar" TEXT,
ALTER COLUMN "day_number" SET DEFAULT 1;

-- CreateTable
CREATE TABLE "TripIncluded" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "text_ar" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TripIncluded_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripExcluded" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "text_ar" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TripExcluded_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripIncluded_trip_id_idx" ON "TripIncluded"("trip_id");

-- CreateIndex
CREATE INDEX "TripExcluded_trip_id_idx" ON "TripExcluded"("trip_id");

-- AddForeignKey
ALTER TABLE "TripIncluded" ADD CONSTRAINT "TripIncluded_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExcluded" ADD CONSTRAINT "TripExcluded_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
