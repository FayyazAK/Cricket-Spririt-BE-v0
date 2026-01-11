-- CreateTable
CREATE TABLE "pending_registrations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "otpExpires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_registrations_email_key" ON "pending_registrations"("email");

-- AlterTable
-- Drop all old columns (those that exist from previous migration)
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationToken";
ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordResetToken";
ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordResetExpires";
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationOTP";
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerificationOTPExpires";

-- Add new columns for password reset only
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetOTP" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordResetOTPExpires" TIMESTAMP(3);

-- Change default for isEmailVerified
ALTER TABLE "users" ALTER COLUMN "isEmailVerified" SET DEFAULT true;
