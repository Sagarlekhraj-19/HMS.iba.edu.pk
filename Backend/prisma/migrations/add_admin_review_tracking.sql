-- Add admin review tracking fields to RoomApplication
-- This migration adds isAdminReviewed and reviewedAt fields to track when admin first views an application

ALTER TABLE "RoomApplication" ADD COLUMN "isAdminReviewed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RoomApplication" ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- Create index for faster queries
CREATE INDEX "RoomApplication_isAdminReviewed_idx" ON "RoomApplication"("isAdminReviewed");
