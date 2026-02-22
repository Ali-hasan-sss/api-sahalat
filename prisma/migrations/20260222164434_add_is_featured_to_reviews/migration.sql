-- AlterTable
ALTER TABLE "CarReview" ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TripReview" ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CarReview_is_featured_idx" ON "CarReview"("is_featured");

-- CreateIndex
CREATE INDEX "TripReview_is_featured_idx" ON "TripReview"("is_featured");
