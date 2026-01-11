# Verification Flow Changes: Link-based to OTP-based (Without User Creation Until Verified)

## Overview
Changed the email verification and password reset flow from link-based to OTP-based verification. **Users are NOT created in the database until they verify their email with the OTP.**

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)

**User Model Changes:**
- Removed: `emailVerificationToken`, `passwordResetToken`, `passwordResetExpires`, `emailVerificationOTP`, `emailVerificationOTPExpires`
- Added: `passwordResetOTP` (String), `passwordResetOTPExpires` (DateTime)
- Changed: `isEmailVerified` default to `true` (since users are only created after verification)

**New Model: PendingRegistration**
Created a new table to store registration data temporarily before email verification:
- `id` (UUID)
- `email` (String, unique)
- `name` (String)
- `password` (String, hashed)
- `otp` (String, 6-digit)
- `otpExpires` (DateTime)
- `createdAt`, `updatedAt` (DateTime)

### 2. Email Service (`src/common/email/email.service.ts`)
**Updated Methods:**

#### `sendEmailVerification(to, name, otp)`
- Changed parameter from `verificationLink` to `otp`
- Now sends a 6-digit OTP instead of verification link
- OTP is displayed prominently in the email with styling
- Email states OTP expires in 15 minutes

#### `sendPasswordReset(to, name, otp)`
- Changed parameter from `resetLink` to `otp`
- Now sends a 6-digit OTP instead of reset link
- OTP is displayed prominently in the email with styling
- Email states OTP expires in 15 minutes

### 3. Auth Service (`src/auth/auth.service.ts`)
**Updated Methods:**

#### `register(registerDto)`
- **DOES NOT create user in database**
- Checks if user already exists
- Checks if pending registration exists (updates if yes, creates if no)
- Hashes password
- Generates 6-digit OTP
- Sets OTP expiry to 15 minutes
- Stores registration data in `PendingRegistration` table
- Sends OTP via email
- Returns email and name (no user ID yet)

#### `verifyEmail(email, otp)`
- Changed parameters from `token` to `email` and `otp`
- Checks if user already exists (error if yes)
- Finds pending registration by email
- Validates OTP matches the stored value
- Checks OTP hasn't expired
- **Creates the actual user in the database** with `isEmailVerified: true`
- Deletes the pending registration record
- Returns the created user data

#### `forgotPassword(email)`
- Generates 6-digit OTP instead of random token
- Sets OTP expiry to 15 minutes
- Stores OTP and expiry in database
- Sends OTP via email

#### `resetPassword(resetPasswordDto)`
- Updated to use `passwordResetOTP` instead of `passwordResetToken`
- Validates OTP and checks expiry
- Clears OTP fields after successful password reset

**New Methods:**

#### `resendVerificationOTP(email)`
- Allows users to request a new verification OTP
- Checks if user already exists (error if yes - should login instead)
- Finds pending registration by email
- Generates new 6-digit OTP
- Updates expiry time to 15 minutes from current time
- Sends new OTP via email

#### `generateOTP()` (private)
- Helper method to generate 6-digit OTP
- Returns random number between 100000 and 999999

### 4. Auth Controller (`src/auth/auth.controller.ts`)
**Updated Endpoints:**

#### `POST /auth/verify-email`
- Now accepts `VerifyEmailDto` containing `email` and `otp`
- Previously accepted only `token` in body

**New Endpoints:**

#### `POST /auth/resend-verification-otp`
- Allows users to resend verification OTP
- Accepts `email` in request body

### 5. New DTO (`src/auth/dtos/verify-email.dto.ts`)
Created new DTO for email verification:
```typescript
{
  email: string (validated as email)
  otp: string (must be exactly 6 characters)
}
```

### 6. Updated DTO (`src/auth/dtos/reset-password.dto.ts`)
- Added validation: OTP must be exactly 6 digits
- Field name remains `token` for backward compatibility

### 7. Database Migration
Created migration file: `prisma/migrations/20260111_otp_verification_with_pending_registration/migration.sql`

Migration:
- Creates `pending_registrations` table
- Drops old token columns from users table
- Adds password reset OTP columns to users table
- Changes `isEmailVerified` default to true

## API Changes

### Updated Endpoints

#### Email Verification
**Before:**
```
POST /auth/verify-email
Body: { token: string }
```

**After:**
```
POST /auth/verify-email
Body: { email: string, otp: string }
```

#### Password Reset Flow
The password reset endpoint signature remains the same, but now uses OTP internally:
```
POST /auth/reset-password
Body: { token: string, password: string }
```
Note: The field is still called `token` but now expects a 6-digit OTP.

### New Endpoints

```
POST /auth/resend-verification-otp
Body: { email: string }
Response: { message: "Verification OTP has been resent to your email." }
```

## Benefits of This Approach

1. **Better User Experience**: Users don't need to click links; they can copy-paste OTP
2. **Mobile Friendly**: Easier to use on mobile devices
3. **Higher Security**: OTPs are single-use and time-limited (15 minutes)
4. **Cleaner Database**: No unverified users cluttering the database
5. **Better Data Integrity**: Only verified users exist in the system
6. **No Orphaned Records**: Pending registrations are automatically cleaned up after verification
7. **Industry Standard**: OTP is widely used and understood by users
8. **Prevents Spam Registrations**: Invalid emails won't create user records

## Migration Notes

- The migration creates a new `pending_registrations` table
- The migration will drop existing verification tokens from users table
- Existing unverified users will remain in the database (consider cleanup)
- New registrations will use the pending registration flow
- OTP expiry is set to 15 minutes (configurable)
- OTP is a 6-digit numeric code
- Pending registrations can be cleaned up periodically (expired ones)

## Testing Checklist

- [ ] User registration creates pending registration (NOT user)
- [ ] User registration sends OTP email
- [ ] Cannot register with existing user email
- [ ] Can re-register with same email (updates pending registration)
- [ ] Email verification with valid OTP creates user
- [ ] Email verification with invalid OTP fails
- [ ] Email verification with expired OTP fails
- [ ] Email verification deletes pending registration
- [ ] Cannot verify email if user already exists
- [ ] Resend verification OTP works
- [ ] Resend OTP fails if user already registered
- [ ] User can login only after email verification
- [ ] Forgot password sends OTP email
- [ ] Password reset with valid OTP succeeds
- [ ] Password reset with invalid OTP fails
- [ ] Password reset with expired OTP fails
