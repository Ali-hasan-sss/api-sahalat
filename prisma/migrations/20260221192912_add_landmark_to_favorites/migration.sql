/*
  Warnings:

  - A unique constraint covering the columns `[user_id,trip_id,car_id,landmark_id]` on the table `Favorite` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[google_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Favorite_user_id_trip_id_car_id_key";

-- AlterTable
ALTER TABLE "Favorite" ADD COLUMN     "landmark_id" UUID;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "google_id" TEXT,
ADD COLUMN     "last_name" TEXT;

-- CreateIndex
CREATE INDEX "Favorite_landmark_id_idx" ON "Favorite"("landmark_id");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_user_id_trip_id_car_id_landmark_id_key" ON "Favorite"("user_id", "trip_id", "car_id", "landmark_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_google_id_key" ON "User"("google_id");

-- CreateIndex
CREATE INDEX "User_google_id_idx" ON "User"("google_id");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_landmark_id_fkey" FOREIGN KEY ("landmark_id") REFERENCES "Landmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;
