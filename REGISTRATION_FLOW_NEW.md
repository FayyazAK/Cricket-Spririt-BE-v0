# NEW Registration Flow (OTP-Based, No User Until Verified)

## 🎯 Core Principle
**Users are NOT created in the database until they verify their email with OTP.**

Registration data is stored temporarily in a `PendingRegistration` table.

---

## 📋 Complete Registration Flow

### **Step 1: User Submits Registration**
**Endpoint:** `POST /auth/register`

**Request:**
```json
{
  "email": "john@example.com",
  "name": "John Doe",
  "password": "securePass123"
}
```

**Backend Process:**
1. ✅ Check if user already exists in `users` table → Error if exists
2. 🔍 Check if pending registration exists for this email
3. 🔐 Hash the password using bcrypt
4. 🎲 Generate 6-digit OTP (e.g., "582746")
5. ⏰ Set OTP expiry (current time + 15 minutes)
6. 💾 **Store in `pending_registrations` table** (create or update):
   ```
   {
     email: "john@example.com",
     name: "John Doe",
     password: "$2b$10$...", // hashed
     otp: "582746",
     otpExpires: "2026-01-11T13:30:00.000Z"
   }
   ```
7. 📧 Send OTP email
8. ✅ Return response (NO user record created yet!)

**Response:**
```json
{
  "message": "Registration initiated. Please check your email for the verification OTP.",
  "data": {
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Note:** No `id` field in response because user doesn't exist yet!

---

### **Step 2: User Receives Email**

**Email Content:**
```
Subject: Verify Your Email Address

Email Verification

Hello John Doe,

Thank you for registering with Cricket Spirit. 
Please use the following OTP to verify your email address:

    582746
    (Large, centered, green text)

This OTP will expire in 15 minutes.

If you did not create an account, please ignore this email.

Best regards,
Cricket Spirit Team
```

---

### **Step 3: User Verifies Email with OTP**
**Endpoint:** `POST /auth/verify-email`

**Request:**
```json
{
  "email": "john@example.com",
  "otp": "582746"
}
```

**Backend Process:**
1. ✅ Check if user already exists in `users` table → Error if exists (already registered)
2. 🔍 Find pending registration by email from `pending_registrations` table
3. ❌ If not found → Error "No pending registration found"
4. ✅ Validate OTP matches
5. ⏰ Check OTP hasn't expired
6. 🎉 **CREATE USER IN DATABASE:**
   ```sql
   INSERT INTO users (email, name, password, isEmailVerified)
   VALUES ('john@example.com', 'John Doe', '$2b$10$...', true);
   ```
7. 🗑️ Delete pending registration record (cleanup)
8. ✅ Return created user data

**Success Response:**
```json
{
  "message": "Email verified successfully. You can now login.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "USER",
    "isEmailVerified": true,
    "createdAt": "2026-01-11T13:25:00.000Z"
  }
}
```

**Error Responses:**
```json
// Invalid OTP
{ "message": "Invalid OTP", "statusCode": 400 }

// Expired OTP
{ "message": "OTP has expired", "statusCode": 400 }

// User already exists (already verified)
{ "message": "User already registered", "statusCode": 400 }

// No pending registration
{ "message": "No pending registration found for this email", "statusCode": 400 }
```

---

### **Step 4: User Can Now Login**
**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securePass123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "USER",
      "isEmailVerified": true
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

## 🔄 Alternative Flow: Resend OTP

### **If User Didn't Receive OTP or It Expired**
**Endpoint:** `POST /auth/resend-verification-otp`

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Backend Process:**
1. ✅ Check if user already exists → Error "User already registered. Please login."
2. 🔍 Find pending registration
3. 🎲 Generate NEW 6-digit OTP
4. ⏰ Set NEW expiry time (15 minutes from now)
5. 💾 Update pending registration with new OTP and expiry
6. 📧 Send new OTP email
7. ✅ Return success message

**Response:**
```json
{
  "message": "Verification OTP has been resent to your email."
}
```

---

## 📊 Database State at Each Step

### Before Registration:
```
users table: (empty for john@example.com)
pending_registrations table: (empty for john@example.com)
```

### After Registration (Step 1):
```
users table: (still empty for john@example.com)
pending_registrations table:
┌────────────────────┬──────────────────┬──────────┬──────────┬────────┬─────────────────────┐
│ id                 │ email            │ name     │ password │ otp    │ otpExpires          │
├────────────────────┼──────────────────┼──────────┼──────────┼────────┼─────────────────────┤
│ uuid-1234          │ john@example.com │ John Doe │ $2b$10.. │ 582746 │ 2026-01-11T13:30:00 │
└────────────────────┴──────────────────┴──────────┴──────────┴────────┴─────────────────────┘
```

### After Email Verification (Step 3):
```
users table:
┌────────────────────┬──────────────────┬──────────┬──────────┬────────────────┬─────────────────────┐
│ id                 │ email            │ name     │ password │ isEmailVerified│ createdAt           │
├────────────────────┼──────────────────┼──────────┼──────────┼────────────────┼─────────────────────┤
│ uuid-5678          │ john@example.com │ John Doe │ $2b$10.. │ true           │ 2026-01-11T13:25:00 │
└────────────────────┴──────────────────┴──────────┴──────────┴────────────────┴─────────────────────┘

pending_registrations table: (john@example.com record DELETED)
```

---

## 🎯 Key Differences from Old Flow

| Aspect | Old Flow | New Flow |
|--------|----------|----------|
| **User Creation** | Immediately on registration | Only after OTP verification |
| **Database Pollution** | Unverified users in DB | Clean - only verified users |
| **isEmailVerified Field** | Starts as `false` | Always `true` (created after verification) |
| **Temporary Storage** | User table with flag | Separate `pending_registrations` table |
| **Failed Verifications** | User stuck as unverified | No user record, can re-register |
| **OTP Storage** | In user record | In pending registration record |
| **Cleanup** | Manual cleanup needed | Automatic on verification |

---

## 🛡️ Security Benefits

1. **No Spam Users**: Invalid emails won't create user records
2. **Clean Database**: Only legitimate, verified users exist
3. **No Orphaned Data**: Pending registrations are deleted after verification
4. **Time-Limited**: OTPs expire in 15 minutes
5. **One-Time Use**: OTP is deleted after successful verification
6. **Protected Against Enumeration**: Similar error messages for privacy

---

## 🔧 Edge Cases Handled

### 1. **User Tries to Register Again Before Verification**
- Pending registration is UPDATED with new OTP
- Old OTP is invalidated
- New OTP sent to email

### 2. **User Tries to Verify After Already Verified**
- Error: "User already registered"
- Should use login instead

### 3. **User Tries to Resend OTP After Verification**
- Error: "User already registered. Please login."

### 4. **OTP Expires**
- User must request resend
- New OTP generated with new expiry

### 5. **Multiple Registration Attempts**
- Each attempt updates the pending registration
- Only the latest OTP is valid

---

## 📝 Implementation Notes

### API Endpoint Summary:
```
POST /auth/register              → Creates pending registration, sends OTP
POST /auth/verify-email          → Creates user, deletes pending registration
POST /auth/resend-verification-otp → Generates new OTP for pending registration
POST /auth/login                 → Works only after user is created (verified)
```

### Database Tables:
```
pending_registrations:
- Temporary storage before verification
- Cleaned up after successful verification
- Can be periodically cleaned (expired records)

users:
- Only contains verified users
- isEmailVerified always true for new registrations
- Created only after OTP verification
```

---

## 🧹 Maintenance Tasks

### Periodic Cleanup (Recommended):
```sql
-- Delete expired pending registrations (older than 24 hours)
DELETE FROM pending_registrations
WHERE otpExpires < NOW() - INTERVAL '24 hours';
```

This prevents the `pending_registrations` table from growing indefinitely with abandoned registrations.

---

## ✅ Summary

**Old Flow:**
1. Register → User created with `isEmailVerified: false`
2. Send verification link
3. Click link → Update user `isEmailVerified: true`

**New Flow:**
1. Register → Pending registration created (NO user yet)
2. Send OTP
3. Verify OTP → User created with `isEmailVerified: true`

**Result:** Cleaner database, better security, no unverified users! 🎉
