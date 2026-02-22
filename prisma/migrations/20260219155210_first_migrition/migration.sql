-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserTokenType" AS ENUM ('OTP_VERIFY', 'PASSWORD_RESET', 'REFRESH');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('TRIP', 'CAR');

-- CreateEnum
CREATE TYPE "DiscountValueType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserToken" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "UserTokenType" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "title_ar" TEXT,
    "description" TEXT,
    "description_ar" TEXT,
    "duration_days" INTEGER NOT NULL,
    "base_price" DECIMAL(10,2) NOT NULL,
    "max_participants" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripImage" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "image_path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TripImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Landmark" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "description" TEXT,
    "description_ar" TEXT,
    "location" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Landmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandmarkImage" (
    "id" UUID NOT NULL,
    "landmark_id" UUID NOT NULL,
    "image_path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LandmarkImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripLandmark" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "landmark_id" UUID NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TripLandmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripBooking" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "start_date" DATE NOT NULL,
    "participants" INTEGER NOT NULL DEFAULT 1,
    "base_price" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "coupon_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(10,2) NOT NULL,
    "coupon_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TripBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripReview" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TripReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "description" TEXT,
    "description_ar" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "base_price_per_day" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarImage" (
    "id" UUID NOT NULL,
    "car_id" UUID NOT NULL,
    "image_path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CarImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarBooking" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "car_id" UUID NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "with_driver" BOOLEAN NOT NULL DEFAULT false,
    "license_image_path" TEXT,
    "license_issuer" TEXT,
    "base_price" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "coupon_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(10,2) NOT NULL,
    "coupon_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CarBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarReview" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "car_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CarReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "trip_id" UUID,
    "car_id" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" UUID NOT NULL,
    "type" "DiscountType" NOT NULL,
    "reference_id" UUID NOT NULL,
    "discount_type" "DiscountValueType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "discount_type" "DiscountValueType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "min_booking_amount" DECIMAL(10,2),
    "max_usages" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponUsage" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "booking_type" TEXT NOT NULL,
    "booking_id" UUID NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "trip_booking_id" UUID,
    "car_booking_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'OMR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider_session_id" TEXT,
    "provider_payment_id" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_deletedAt_idx" ON "User"("email", "deletedAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "UserToken_user_id_type_idx" ON "UserToken"("user_id", "type");

-- CreateIndex
CREATE INDEX "UserToken_token_hash_idx" ON "UserToken"("token_hash");

-- CreateIndex
CREATE INDEX "Trip_is_active_deletedAt_idx" ON "Trip"("is_active", "deletedAt");

-- CreateIndex
CREATE INDEX "Trip_base_price_idx" ON "Trip"("base_price");

-- CreateIndex
CREATE INDEX "TripImage_trip_id_idx" ON "TripImage"("trip_id");

-- CreateIndex
CREATE INDEX "Landmark_is_active_deletedAt_idx" ON "Landmark"("is_active", "deletedAt");

-- CreateIndex
CREATE INDEX "LandmarkImage_landmark_id_idx" ON "LandmarkImage"("landmark_id");

-- CreateIndex
CREATE INDEX "TripLandmark_trip_id_idx" ON "TripLandmark"("trip_id");

-- CreateIndex
CREATE INDEX "TripLandmark_landmark_id_idx" ON "TripLandmark"("landmark_id");

-- CreateIndex
CREATE UNIQUE INDEX "TripLandmark_trip_id_landmark_id_key" ON "TripLandmark"("trip_id", "landmark_id");

-- CreateIndex
CREATE INDEX "TripBooking_user_id_idx" ON "TripBooking"("user_id");

-- CreateIndex
CREATE INDEX "TripBooking_trip_id_idx" ON "TripBooking"("trip_id");

-- CreateIndex
CREATE INDEX "TripBooking_status_idx" ON "TripBooking"("status");

-- CreateIndex
CREATE INDEX "TripBooking_start_date_idx" ON "TripBooking"("start_date");

-- CreateIndex
CREATE INDEX "TripReview_trip_id_idx" ON "TripReview"("trip_id");

-- CreateIndex
CREATE INDEX "TripReview_user_id_idx" ON "TripReview"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "TripReview_user_id_trip_id_key" ON "TripReview"("user_id", "trip_id");

-- CreateIndex
CREATE INDEX "Car_is_active_deletedAt_idx" ON "Car"("is_active", "deletedAt");

-- CreateIndex
CREATE INDEX "Car_base_price_per_day_idx" ON "Car"("base_price_per_day");

-- CreateIndex
CREATE INDEX "CarImage_car_id_idx" ON "CarImage"("car_id");

-- CreateIndex
CREATE INDEX "CarBooking_user_id_idx" ON "CarBooking"("user_id");

-- CreateIndex
CREATE INDEX "CarBooking_car_id_idx" ON "CarBooking"("car_id");

-- CreateIndex
CREATE INDEX "CarBooking_status_idx" ON "CarBooking"("status");

-- CreateIndex
CREATE INDEX "CarBooking_start_date_idx" ON "CarBooking"("start_date");

-- CreateIndex
CREATE INDEX "CarReview_car_id_idx" ON "CarReview"("car_id");

-- CreateIndex
CREATE INDEX "CarReview_user_id_idx" ON "CarReview"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "CarReview_user_id_car_id_key" ON "CarReview"("user_id", "car_id");

-- CreateIndex
CREATE INDEX "Favorite_user_id_idx" ON "Favorite"("user_id");

-- CreateIndex
CREATE INDEX "Favorite_trip_id_idx" ON "Favorite"("trip_id");

-- CreateIndex
CREATE INDEX "Favorite_car_id_idx" ON "Favorite"("car_id");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_user_id_trip_id_car_id_key" ON "Favorite"("user_id", "trip_id", "car_id");

-- CreateIndex
CREATE INDEX "Discount_type_reference_id_idx" ON "Discount"("type", "reference_id");

-- CreateIndex
CREATE INDEX "Discount_start_date_end_date_idx" ON "Discount"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "Discount_is_active_idx" ON "Discount"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_expires_at_is_active_idx" ON "Coupon"("expires_at", "is_active");

-- CreateIndex
CREATE INDEX "CouponUsage_coupon_id_idx" ON "CouponUsage"("coupon_id");

-- CreateIndex
CREATE INDEX "CouponUsage_user_id_idx" ON "CouponUsage"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_trip_booking_id_key" ON "Payment"("trip_booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_car_booking_id_key" ON "Payment"("car_booking_id");

-- CreateIndex
CREATE INDEX "Payment_provider_session_id_idx" ON "Payment"("provider_session_id");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "WebhookLog_payment_id_idx" ON "WebhookLog"("payment_id");

-- CreateIndex
CREATE INDEX "WebhookLog_event_idx" ON "WebhookLog"("event");

-- AddForeignKey
ALTER TABLE "UserToken" ADD CONSTRAINT "UserToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripImage" ADD CONSTRAINT "TripImage_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LandmarkImage" ADD CONSTRAINT "LandmarkImage_landmark_id_fkey" FOREIGN KEY ("landmark_id") REFERENCES "Landmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripLandmark" ADD CONSTRAINT "TripLandmark_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripLandmark" ADD CONSTRAINT "TripLandmark_landmark_id_fkey" FOREIGN KEY ("landmark_id") REFERENCES "Landmark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripBooking" ADD CONSTRAINT "TripBooking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripBooking" ADD CONSTRAINT "TripBooking_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripBooking" ADD CONSTRAINT "TripBooking_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripReview" ADD CONSTRAINT "TripReview_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarImage" ADD CONSTRAINT "CarImage_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarBooking" ADD CONSTRAINT "CarBooking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarBooking" ADD CONSTRAINT "CarBooking_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarBooking" ADD CONSTRAINT "CarBooking_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarReview" ADD CONSTRAINT "CarReview_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarReview" ADD CONSTRAINT "CarReview_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponUsage" ADD CONSTRAINT "CouponUsage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_trip_booking_id_fkey" FOREIGN KEY ("trip_booking_id") REFERENCES "TripBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_car_booking_id_fkey" FOREIGN KEY ("car_booking_id") REFERENCES "CarBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
