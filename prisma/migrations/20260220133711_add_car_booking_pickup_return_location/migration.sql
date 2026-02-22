/*
  Warnings:

  - Added the required column `pickup_location` to the `CarBooking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `return_location` to the `CarBooking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CarBooking" ADD COLUMN     "pickup_location" TEXT NOT NULL,
ADD COLUMN     "return_location" TEXT NOT NULL;
