# Cricket Spirit API Documentation

## Base URL
```
Development: http://localhost:3000
Production: [Your production URL]
```

## CORS (Cross-Origin Resource Sharing)
✅ **CORS is enabled** - The API accepts requests from all origins.
- All standard HTTP methods are supported (GET, POST, PUT, PATCH, DELETE, OPTIONS)
- Credentials (cookies, authorization headers) are allowed
- No additional configuration needed on the frontend

## Authentication Endpoints

All authentication endpoints are prefixed with `/auth`

---

## 📝 Table of Contents

### Authentication
1. [Register](#1-register)
2. [Verify Email](#2-verify-email)
3. [Resend Verification OTP](#3-resend-verification-otp)
4. [Login](#4-login)
5. [Refresh Token](#5-refresh-token)
6. [Forgot Password](#6-forgot-password)
7. [Reset Password](#7-reset-password)
8. [Get Current User](#8-get-current-user)

### Player Management
9. [Register Player Profile](#9-register-player-profile)
10. [Get Bowling Types](#10-get-bowling-types)
11. [Upload Profile Picture](#11-upload-profile-picture)
12. [Get All Players](#12-get-all-players)
13. [Get Player by ID](#13-get-player-by-id)
14. [Update Player](#14-update-player)
15. [Deactivate Player](#15-deactivate-player)

16. [Error Responses](#error-responses)
17. [Enums Reference](#enums-reference)

---

## 1. Register

Create a new user account. The user will NOT be created in the database until they verify their email with OTP.

### Endpoint
```
POST /auth/register
```

### Request Body
```json
{
  "email": "string (required, valid email)",
  "name": "string (required, min 2 characters)",
  "password": "string (required, min 6 characters)"
}
```

### Example Request
```json
{
  "email": "john.doe@example.com",
  "name": "John Doe",
  "password": "securePassword123"
}
```

### Success Response (201 Created)
```json
{
  "message": "Registration initiated. Please check your email for the verification OTP.",
  "data": {
    "email": "john.doe@example.com",
    "name": "John Doe"
  }
}
```

**Note:** No `id` field is returned because the user doesn't exist in the database yet.

### What Happens
1. A pending registration is created
2. A 6-digit OTP is generated and sent to the email
3. OTP expires in 15 minutes
4. If user already exists → Error
5. If pending registration exists → It gets updated with new OTP

### Error Responses
```json
// User already exists
{
  "statusCode": 400,
  "message": "User with this email already exists"
}

// Validation errors
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "name must be longer than or equal to 2 characters",
    "password must be longer than or equal to 6 characters"
  ]
}
```

---

## 2. Verify Email

Verify email address with OTP and create the user account.

### Endpoint
```
POST /auth/verify-email
```

### Request Body
```json
{
  "email": "string (required, valid email)",
  "otp": "string (required, exactly 6 digits)"
}
```

### Example Request
```json
{
  "email": "john.doe@example.com",
  "otp": "123456"
}
```

### Success Response (200 OK)
```json
{
  "message": "Email verified successfully. You can now login.",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "USER",
    "isEmailVerified": true,
    "createdAt": "2026-01-11T13:25:00.000Z"
  }
}
```

### What Happens
1. Validates OTP against pending registration
2. Checks if OTP is expired
3. Creates the actual user in the database
4. Deletes the pending registration
5. User can now login

### Error Responses
```json
// Invalid OTP
{
  "statusCode": 400,
  "message": "Invalid OTP"
}

// Expired OTP
{
  "statusCode": 400,
  "message": "OTP has expired"
}

// User already registered
{
  "statusCode": 400,
  "message": "User already registered"
}

// No pending registration found
{
  "statusCode": 400,
  "message": "No pending registration found for this email"
}
```

---

## 3. Resend Verification OTP

Request a new OTP if the previous one expired or wasn't received.

### Endpoint
```
POST /auth/resend-verification-otp
```

### Request Body
```json
{
  "email": "string (required, valid email)"
}
```

### Example Request
```json
{
  "email": "john.doe@example.com"
}
```

### Success Response (200 OK)
```json
{
  "message": "Verification OTP has been resent to your email."
}
```

### What Happens
1. Checks if user already exists (error if yes)
2. Finds pending registration
3. Generates new 6-digit OTP
4. Updates OTP and expiry time
5. Sends new email with OTP

### Error Responses
```json
// User already registered
{
  "statusCode": 400,
  "message": "User already registered. Please login."
}

// No pending registration
{
  "statusCode": 400,
  "message": "No pending registration found for this email"
}
```

---

## 4. Login

Authenticate user and receive access and refresh tokens.

### Endpoint
```
POST /auth/login
```

### Request Body
```json
{
  "email": "string (required, valid email)",
  "password": "string (required)"
}
```

### Example Request
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

### Success Response (200 OK)

**If user has NO player profile:**
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "role": "USER",
      "isEmailVerified": true,
      "hasPlayerProfile": false
    },
    "player": null,
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**If user HAS player profile:**
```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "role": "USER",
      "isEmailVerified": true,
      "hasPlayerProfile": true
    },
    "player": {
      "id": "player-uuid",
      "firstName": "Virat",
      "lastName": "Kohli",
      "gender": "MALE",
      "dateOfBirth": "1988-11-05T00:00:00.000Z",
      "profilePicture": "http://localhost:3000/uploads/profile-pictures/abc123.jpg",
      "playerType": "BATSMAN",
      "isWicketKeeper": false,
      "batHand": "RIGHT",
      "bowlHand": "RIGHT",
      "isActive": true,
      "address": {
        "id": "address-uuid",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India"
      },
      "bowlingTypes": [
        {
          "id": "bowling-type-uuid",
          "shortName": "FAST",
          "fullName": "Fast"
        }
      ]
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Token Usage
- **Access Token**: Include in Authorization header for protected routes
  ```
  Authorization: Bearer <accessToken>
  ```
- **Refresh Token**: Use to get new access token when it expires

### Error Responses
```json
// Invalid credentials
{
  "statusCode": 401,
  "message": "Invalid credentials"
}

// Account deactivated
{
  "statusCode": 401,
  "message": "Account has been deactivated"
}
```

**Important:** User must verify email before they can login!

---

## 5. Refresh Token

Get a new access token using refresh token.

### Endpoint
```
POST /auth/refresh
```

### Headers
```
Authorization: Bearer <refreshToken>
```

### Request Body
```json
{
  "refreshToken": "string (required)"
}
```

### Example Request
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Success Response (200 OK)
```json
{
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error Responses
```json
// Invalid refresh token
{
  "statusCode": 401,
  "message": "Invalid refresh token"
}

// User not found or deactivated
{
  "statusCode": 401,
  "message": "User not found or deactivated"
}
```

---

## 6. Forgot Password

Request a password reset OTP.

### Endpoint
```
POST /auth/forgot-password
```

### Request Body
```json
{
  "email": "string (required, valid email)"
}
```

### Example Request
```json
{
  "email": "john.doe@example.com"
}
```

### Success Response (200 OK)
```json
{
  "message": "If an account with that email exists, a password reset OTP has been sent."
}
```

### What Happens
1. Finds user by email (doesn't reveal if user exists)
2. Generates 6-digit OTP
3. Sets OTP expiry to 15 minutes
4. Sends OTP via email
5. Returns generic success message

**Note:** Response is the same whether user exists or not (security best practice).

---

## 7. Reset Password

Reset password using OTP received via email.

### Endpoint
```
POST /auth/reset-password
```

### Request Body
```json
{
  "token": "string (required, exactly 6 digits)",
  "password": "string (required, min 6 characters)"
}
```

**Note:** The field is called `token` but it's actually the 6-digit OTP.

### Example Request
```json
{
  "token": "123456",
  "password": "newSecurePassword123"
}
```

### Success Response (200 OK)
```json
{
  "message": "Password reset successfully"
}
```

### What Happens
1. Validates OTP
2. Checks if OTP is expired
3. Hashes new password
4. Updates user password
5. Clears OTP fields

### Error Responses
```json
// Invalid OTP
{
  "statusCode": 400,
  "message": "Invalid or expired OTP"
}

// Validation error
{
  "statusCode": 400,
  "message": [
    "token must be exactly 6 digits",
    "password must be longer than or equal to 6 characters"
  ]
}
```

---

## 8. Get Current User

Get authenticated user's profile information including player profile if exists.

### Endpoint
```
GET /auth/me
```

### Headers
```
Authorization: Bearer <accessToken>
```

### Success Response (200 OK)

**If user has NO player profile:**
```json
{
  "message": "User retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "USER",
    "isEmailVerified": true,
    "createdAt": "2026-01-11T13:25:00.000Z",
    "updatedAt": "2026-01-11T13:25:00.000Z",
    "deletedAt": null,
    "player": null
  }
}
```

**If user HAS player profile:**
```json
{
  "message": "User retrieved successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "USER",
    "isEmailVerified": true,
    "createdAt": "2026-01-11T13:25:00.000Z",
    "updatedAt": "2026-01-11T13:25:00.000Z",
    "deletedAt": null,
    "player": {
      "id": "player-uuid",
      "firstName": "Virat",
      "lastName": "Kohli",
      "gender": "MALE",
      "dateOfBirth": "1988-11-05T00:00:00.000Z",
      "profilePicture": "http://localhost:3000/uploads/profile-pictures/abc123.jpg",
      "playerType": "BATSMAN",
      "isWicketKeeper": false,
      "batHand": "RIGHT",
      "bowlHand": "RIGHT",
      "isActive": true,
      "address": {
        "id": "address-uuid",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "postalCode": "400053"
      },
      "bowlingTypes": [
        {
          "id": "bowling-type-uuid",
          "shortName": "FAST",
          "fullName": "Fast"
        }
      ],
      "createdAt": "2026-01-11T14:00:00.000Z",
      "updatedAt": "2026-01-11T14:00:00.000Z"
    }
  }
}
```

### Error Responses
```json
// No token provided
{
  "statusCode": 401,
  "message": "Unauthorized"
}

// Invalid token
{
  "statusCode": 401,
  "message": "Invalid token"
}

// User not found
{
  "statusCode": 401,
  "message": "User not found"
}
```

---

## 9. Register Player Profile

Create a player profile for the authenticated user. **Requires authentication.**

### Endpoint
```
POST /api/v1/players/register
```

### Headers
```
Authorization: Bearer <accessToken>
```

### Request Body
```json
{
  "firstName": "string (required, min 1 character)",
  "lastName": "string (required, min 1 character)",
  "gender": "MALE | FEMALE | OTHER (optional, default: MALE)",
  "dateOfBirth": "string (required, ISO 8601 date format)",
  "profilePicture": "string (optional, URL from upload endpoint)",
  "playerType": "BATSMAN | BOWLER | ALL_ROUNDER (required)",
  "isWicketKeeper": "boolean (optional, default: false)",
  "batHand": "LEFT | RIGHT (required)",
  "bowlHand": "LEFT | RIGHT (optional)",
  "bowlingTypeIds": "array of strings (required, bowling type IDs)",
  "address": {
    "street": "string (optional)",
    "townSuburb": "string (optional)",
    "city": "string (required)",
    "state": "string (required)",
    "country": "string (required)",
    "postalCode": "string (optional)"
  }
}
```

### Example Request
```json
{
  "firstName": "Virat",
  "lastName": "Kohli",
  "gender": "MALE",
  "dateOfBirth": "1988-11-05",
  "profilePicture": "http://localhost:3000/uploads/profile-pictures/abc123.jpg",
  "playerType": "BATSMAN",
  "isWicketKeeper": false,
  "batHand": "RIGHT",
  "bowlHand": "RIGHT",
  "bowlingTypeIds": ["bowling-type-id-1", "bowling-type-id-2"],
  "address": {
    "street": "123 Cricket Lane",
    "townSuburb": "Andheri",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "postalCode": "400053"
  }
}
```

### Success Response (201 Created)
```json
{
  "message": "Player profile created successfully",
  "data": {
    "id": "player-uuid",
    "firstName": "Virat",
    "lastName": "Kohli",
    "gender": "MALE",
    "dateOfBirth": "1988-11-05T00:00:00.000Z",
    "profilePicture": "http://localhost:3000/uploads/profile-pictures/abc123.jpg",
    "playerType": "BATSMAN",
    "isWicketKeeper": false,
    "batHand": "RIGHT",
    "bowlHand": "RIGHT",
    "isActive": true,
    "address": {
      "id": "address-uuid",
      "street": "123 Cricket Lane",
      "townSuburb": "Andheri",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "postalCode": "400053"
    },
    "bowlingTypes": [
      {
        "id": "bowling-type-id-1",
        "shortName": "FAST",
        "fullName": "Fast"
      },
      {
        "id": "bowling-type-id-2",
        "shortName": "FAST_MEDIUM",
        "fullName": "Fast Medium"
      }
    ],
    "createdAt": "2026-01-11T14:00:00.000Z",
    "updatedAt": "2026-01-11T14:00:00.000Z"
  }
}
```

### What Happens
1. Validates user is authenticated
2. Checks if user already has a player profile
3. Creates address record
4. Creates player profile linked to the user
5. Associates bowling types with player
6. Returns complete player profile

### Error Responses
```json
// User already has a player profile
{
  "statusCode": 400,
  "message": "Player profile already exists for this user"
}

// Invalid bowling type ID
{
  "statusCode": 400,
  "message": "Invalid bowling type ID"
}

// Validation errors
{
  "statusCode": 400,
  "message": [
    "firstName must be longer than or equal to 1 characters",
    "dateOfBirth must be a valid ISO 8601 date string",
    "playerType must be one of the following values: BATSMAN, BOWLER, ALL_ROUNDER"
  ]
}

// No authentication token
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 10. Get Bowling Types

Get list of all available bowling types. **No authentication required.**

### Endpoint
```
GET /api/v1/bowling-types
```

### Success Response (200 OK)
```json
{
  "message": "Bowling types retrieved successfully",
  "data": [
    {
      "id": "uuid-1",
      "shortName": "FAST",
      "fullName": "Fast"
    },
    {
      "id": "uuid-2",
      "shortName": "FAST_MEDIUM",
      "fullName": "Fast Medium"
    },
    {
      "id": "uuid-3",
      "shortName": "OFF_SPIN",
      "fullName": "Off Spin"
    },
    {
      "id": "uuid-4",
      "shortName": "LEG_SPIN",
      "fullName": "Leg Spin"
    },
    {
      "id": "uuid-5",
      "shortName": "CHINAMAN",
      "fullName": "Chinaman"
    },
    {
      "id": "uuid-6",
      "shortName": "ORTHODOX",
      "fullName": "Orthodox"
    }
  ]
}
```

**Note:** The bowling hand (LEFT/RIGHT) is captured separately in the `bowlHand` field of the player profile.

---

## 11. Upload Profile Picture

Upload a profile picture for the player. **Requires authentication.**

### Endpoint
```
POST /api/v1/players/upload-profile-picture
```

### Headers
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

### Request Body (Form Data)
```
file: <image file>
```

### File Requirements
- **Max Size**: 1MB
- **Allowed Types**: jpg, jpeg, png, webp
- **Field Name**: `file`

### Example Request (JavaScript)
```javascript
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('http://localhost:3000/api/v1/players/upload-profile-picture', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});
```

### Success Response (201 Created)
```json
{
  "message": "Profile picture uploaded successfully",
  "data": {
    "filePath": "profile-pictures/1673456789-abc123.jpg",
    "fileUrl": "http://localhost:3000/uploads/profile-pictures/1673456789-abc123.jpg"
  }
}
```

**Note:** Use the `fileUrl` value when creating/updating player profile.

### Error Responses
```json
// File too large
{
  "statusCode": 400,
  "message": "File size exceeds 1MB"
}

// Invalid file type
{
  "statusCode": 400,
  "message": "Invalid file type. Allowed: jpg, jpeg, png, webp"
}

// No file provided
{
  "statusCode": 400,
  "message": "File is required"
}
```

---

## 12. Get All Players

Get list of all players with optional filters. **Requires authentication.**

### Endpoint
```
GET /api/v1/players
```

### Headers
```
Authorization: Bearer <accessToken>
```

### Query Parameters (all optional)
```
gender: MALE | FEMALE | OTHER
playerType: BATSMAN | BOWLER | ALL_ROUNDER
isWicketKeeper: true | false
batHand: LEFT | RIGHT
bowlHand: LEFT | RIGHT
city: string
state: string
country: string
```

### Example Request
```http
GET /api/v1/players?playerType=BATSMAN&batHand=RIGHT&city=Mumbai
Authorization: Bearer <accessToken>
```

### Success Response (200 OK)
```json
{
  "message": "Players retrieved successfully",
  "data": [
    {
      "id": "player-uuid-1",
      "firstName": "Virat",
      "lastName": "Kohli",
      "gender": "MALE",
      "dateOfBirth": "1988-11-05T00:00:00.000Z",
      "profilePicture": "http://localhost:3000/uploads/profile-pictures/abc123.jpg",
      "playerType": "BATSMAN",
      "isWicketKeeper": false,
      "batHand": "RIGHT",
      "bowlHand": "RIGHT",
      "isActive": true,
      "address": {
        "id": "address-uuid-1",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India"
      },
      "bowlingTypes": [],
      "createdAt": "2026-01-11T14:00:00.000Z",
      "updatedAt": "2026-01-11T14:00:00.000Z"
    }
  ]
}
```

---

## 13. Get Player by ID

Get detailed information about a specific player. **Requires authentication.**

### Endpoint
```
GET /api/v1/players/:id
```

### Headers
```
Authorization: Bearer <accessToken>
```

### Success Response (200 OK)
```json
{
  "message": "Player retrieved successfully",
  "data": {
    "id": "player-uuid",
    "firstName": "Virat",
    "lastName": "Kohli",
    "gender": "MALE",
    "dateOfBirth": "1988-11-05T00:00:00.000Z",
    "profilePicture": "http://localhost:3000/uploads/profile-pictures/abc123.jpg",
    "playerType": "BATSMAN",
    "isWicketKeeper": false,
    "batHand": "RIGHT",
    "bowlHand": "RIGHT",
    "isActive": true,
    "address": {
      "id": "address-uuid",
      "street": "123 Cricket Lane",
      "townSuburb": "Andheri",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "postalCode": "400053"
    },
    "bowlingTypes": [
      {
        "id": "bowling-type-id",
        "shortName": "OFF_SPIN",
        "fullName": "Off Spin"
      }
    ],
    "createdAt": "2026-01-11T14:00:00.000Z",
    "updatedAt": "2026-01-11T14:00:00.000Z"
  }
}
```

### Error Responses
```json
// Player not found
{
  "statusCode": 404,
  "message": "Player not found"
}
```

---

## 14. Update Player

Update player profile information. **Requires authentication. Can only update own profile.**

### Endpoint
```
PUT /api/v1/players/:id
```

### Headers
```
Authorization: Bearer <accessToken>
```

### Request Body
All fields are optional. Only include fields you want to update.

```json
{
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "gender": "MALE | FEMALE | OTHER (optional)",
  "dateOfBirth": "string (optional, ISO 8601 date)",
  "profilePicture": "string (optional)",
  "playerType": "BATSMAN | BOWLER | ALL_ROUNDER (optional)",
  "isWicketKeeper": "boolean (optional)",
  "batHand": "LEFT | RIGHT (optional)",
  "bowlHand": "LEFT | RIGHT (optional)",
  "bowlingTypeIds": "array of strings (optional)",
  "address": {
    "street": "string (optional)",
    "townSuburb": "string (optional)",
    "city": "string (optional)",
    "state": "string (optional)",
    "country": "string (optional)",
    "postalCode": "string (optional)"
  }
}
```

### Success Response (200 OK)
```json
{
  "message": "Player updated successfully",
  "data": {
    "id": "player-uuid",
    "firstName": "Virat",
    "lastName": "Kohli",
    // ... full player object
  }
}
```

### Error Responses
```json
// Unauthorized to update this player
{
  "statusCode": 403,
  "message": "You can only update your own player profile"
}
```

---

## 15. Deactivate Player

Soft delete/deactivate a player profile. **Requires authentication. Can only deactivate own profile.**

### Endpoint
```
DELETE /api/v1/players/:id
```

### Headers
```
Authorization: Bearer <accessToken>
```

### Success Response (200 OK)
```json
{
  "message": "Player deactivated successfully"
}
```

### Error Responses
```json
// Unauthorized
{
  "statusCode": 403,
  "message": "You can only deactivate your own player profile"
}

// Player not found
{
  "statusCode": 404,
  "message": "Player not found"
}
```

---

## Error Responses

### Standard Error Format
All errors follow this structure:
```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created (registration initiated)
- `400` - Bad Request (validation errors, invalid data)
- `401` - Unauthorized (authentication failed)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Enums Reference

### Gender
```
MALE
FEMALE
OTHER
```

### PlayerType
```
BATSMAN - Player specializes in batting
BOWLER - Player specializes in bowling
ALL_ROUNDER - Player is proficient in both batting and bowling
```

### Hand
```
LEFT - Left-handed
RIGHT - Right-handed
```

### Common Bowling Types (shortName - fullName)
```
FAST - Fast
FAST_MEDIUM - Fast Medium
OFF_SPIN - Off Spin
LEG_SPIN - Leg Spin
CHINAMAN - Chinaman
ORTHODOX - Orthodox
```

**Note:** 
- Bowling hand (LEFT/RIGHT) is captured separately in the player profile
- Use the `GET /api/v1/bowling-types` endpoint to get the actual IDs and complete list

---

## 🔐 Authentication Flow for Frontend

### Complete Registration Flow

```
1. User fills registration form
   ↓
2. POST /auth/register
   ↓
3. Show "Check your email" message
   ↓
4. User enters OTP from email
   ↓
5. POST /auth/verify-email
   ↓
6. Redirect to login page
   ↓
7. User logs in
   ↓
8. POST /auth/login
   ↓
9. Store tokens (localStorage/sessionStorage)
   ↓
10. Redirect to dashboard
```

### Password Reset Flow

```
1. User clicks "Forgot Password"
   ↓
2. User enters email
   ↓
3. POST /auth/forgot-password
   ↓
4. Show "Check your email" message
   ↓
5. User enters OTP and new password
   ↓
6. POST /auth/reset-password
   ↓
7. Show success message
   ↓
8. Redirect to login
```

### Complete User + Player Registration Flow

```
1. User registers account
   POST /api/v1/auth/register
   ↓
2. User verifies email with OTP
   POST /api/v1/auth/verify-email
   ↓
3. User logs in
   POST /api/v1/auth/login
   ↓
4. Check response: user.hasPlayerProfile
   ↓
5a. If hasPlayerProfile = false:
    → Redirect to player registration
    → GET /api/v1/bowling-types
    → (Optional) POST /api/v1/players/upload-profile-picture
    → POST /api/v1/players/register
    → Redirect to dashboard
    ↓
5b. If hasPlayerProfile = true:
    → Redirect directly to dashboard
    → Player data already available in login response
```

**Important Notes:**
- Login and `/auth/me` endpoints automatically return player profile if it exists
- Check `hasPlayerProfile` flag to determine if player registration is needed
- User must be authenticated (logged in) before creating player profile
- Profile picture upload is optional but recommended
- Each user can only have ONE player profile
- Bowling types must be fetched before showing the registration form
- Address information is required

### Token Management

```javascript
// After login, store tokens
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);

// Include access token in API requests
headers: {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
}

// When access token expires (401 error)
// Use refresh token to get new access token
POST /auth/refresh
{
  "refreshToken": localStorage.getItem('refreshToken')
}
```

---

## 📋 Validation Rules

### Email
- Must be valid email format
- Example: `user@example.com`

### Name
- Minimum 2 characters
- Required

### Password
- Minimum 6 characters
- Required
- Should be strong (frontend can add additional validation)

### OTP
- Exactly 6 digits
- Numeric only
- Examples: `123456`, `098765`

---

## 🧪 Testing with Postman/Thunder Client

**Note:** All endpoints are prefixed with `/api/v1/`

### Authentication Flow

#### 1. Register
```http
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "name": "Test User",
  "password": "password123"
}
```

#### 2. Check Email for OTP
Look in your email for the 6-digit OTP (e.g., `582746`)

#### 3. Verify Email
```http
POST http://localhost:3000/api/v1/auth/verify-email
Content-Type: application/json

{
  "email": "test@example.com",
  "otp": "582746"
}
```

#### 4. Login
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

#### 5. Get Current User
```http
GET http://localhost:3000/api/v1/auth/me
Authorization: Bearer <your-access-token>
```

### Player Registration Flow

#### 1. Get Bowling Types
```http
GET http://localhost:3000/api/v1/bowling-types
```

#### 2. Upload Profile Picture (Optional)
```http
POST http://localhost:3000/api/v1/players/upload-profile-picture
Authorization: Bearer <your-access-token>
Content-Type: multipart/form-data

file: <select image file>
```

#### 3. Register Player Profile
```http
POST http://localhost:3000/api/v1/players/register
Authorization: Bearer <your-access-token>
Content-Type: application/json

{
  "firstName": "Virat",
  "lastName": "Kohli",
  "gender": "MALE",
  "dateOfBirth": "1988-11-05",
  "playerType": "BATSMAN",
  "isWicketKeeper": false,
  "batHand": "RIGHT",
  "bowlHand": "RIGHT",
  "bowlingTypeIds": ["<bowling-type-uuid-1>", "<bowling-type-uuid-2>"],
  "address": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "postalCode": "400053"
  }
}
```

#### 4. Get All Players
```http
GET http://localhost:3000/api/v1/players
Authorization: Bearer <your-access-token>
```

#### 5. Get Player by ID
```http
GET http://localhost:3000/api/v1/players/<player-uuid>
Authorization: Bearer <your-access-token>
```

---

## 🚨 Important Notes for Frontend

### 1. API Base Path
- All endpoints are prefixed with `/api/v1/`
- Example: `http://localhost:3000/api/v1/auth/register`
- Don't forget to include this in your API calls!

### 2. CORS Configuration
- ✅ **CORS is enabled** on the backend for all origins
- No additional proxy configuration needed
- You can make direct API calls from any frontend domain
- Both `localhost` and production domains are supported

### 3. Player Registration Requirements
- User must be logged in (authenticated) to create player profile
- Each user can only have ONE player profile
- Bowling types should be fetched before showing the registration form
- Profile picture upload is optional but recommended
- Address information is required (city, state, country are mandatory)

### 4. Player Profile in Auth Responses
- ✅ Login response includes `hasPlayerProfile` flag and `player` object
- ✅ `/auth/me` endpoint returns full player profile if exists
- ✅ Use `hasPlayerProfile` to conditionally redirect users
- ✅ Player profile includes address and bowling types
- **Frontend Flow:**
  ```javascript
  // After login
  if (!response.data.user.hasPlayerProfile) {
    navigate('/player/register');  // Force player registration
  } else {
    navigate('/dashboard');  // User is fully set up
  }
  ```

### 5. OTP Expiry
- OTPs expire in **15 minutes**
- Show countdown timer on verification screen
- Provide "Resend OTP" button

### 6. Token Storage
- Store tokens securely
- Consider using httpOnly cookies for production
- Clear tokens on logout

### 7. Error Handling
- Always check `statusCode` in response
- Display user-friendly error messages
- Handle validation errors (array of messages)

### 8. Loading States
- Show loading indicators during API calls
- Disable submit buttons to prevent double submission

### 9. User Feedback
- Show success messages
- Display clear error messages
- Provide helpful hints (e.g., "OTP sent to your email")

### 10. File Upload Best Practices
- Validate file size on frontend (max 1MB)
- Validate file type before upload (jpg, jpeg, png, webp)
- Show image preview before upload
- Display upload progress
- Handle upload errors gracefully

### 11. Security Best Practices
- Don't log sensitive data (passwords, tokens)
- Clear forms after successful submission
- Implement CSRF protection
- Use HTTPS in production

---

## 📱 Example Frontend Implementation (React)

### Registration Component
```javascript
const handleRegister = async (formData) => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Show OTP verification screen
      setShowOTPScreen(true);
      setEmail(formData.email);
    } else {
      // Show error message
      setError(data.message);
    }
  } catch (error) {
    setError('Network error. Please try again.');
  }
};
```

### OTP Verification Component
```javascript
const handleVerifyOTP = async (email, otp) => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Redirect to login
      navigate('/login');
      showSuccessMessage('Email verified! Please login.');
    } else {
      setError(data.message);
    }
  } catch (error) {
    setError('Network error. Please try again.');
  }
};
```

### Login Component
```javascript
const handleLogin = async (credentials) => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store tokens
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      
      // Store user and player info
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // Check if user has player profile
      if (data.data.user.hasPlayerProfile && data.data.player) {
        localStorage.setItem('player', JSON.stringify(data.data.player));
        navigate('/dashboard');
      } else {
        // Redirect to player registration if no profile
        navigate('/player/register');
      }
    } else {
      setError(data.message);
    }
  } catch (error) {
    setError('Network error. Please try again.');
  }
};
```

### Protected API Calls
```javascript
const fetchProtectedData = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch('http://localhost:3000/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      // Token expired, try to refresh
      await refreshToken();
      // Retry the request
      return fetchProtectedData();
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching protected data:', error);
  }
};
```

### Player Registration Component
```javascript
const handlePlayerRegistration = async (playerData) => {
  try {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch('http://localhost:3000/api/v1/players/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(playerData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showSuccessMessage('Player profile created successfully!');
      navigate('/player-profile');
    } else {
      setError(data.message);
    }
  } catch (error) {
    setError('Network error. Please try again.');
  }
};

// Example player data
const playerData = {
  firstName: "Virat",
  lastName: "Kohli",
  gender: "MALE",
  dateOfBirth: "1988-11-05",
  playerType: "BATSMAN",
  isWicketKeeper: false,
  batHand: "RIGHT",
  bowlHand: "RIGHT",
  bowlingTypeIds: ["uuid-1", "uuid-2"],
  address: {
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    postalCode: "400053"
  }
};
```

### Upload Profile Picture
```javascript
const handleProfilePictureUpload = async (file) => {
  try {
    const token = localStorage.getItem('accessToken');
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('http://localhost:3000/api/v1/players/upload-profile-picture', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Use data.data.fileUrl in player registration
      setProfilePictureUrl(data.data.fileUrl);
      return data.data.fileUrl;
    } else {
      setError(data.message);
    }
  } catch (error) {
    setError('Failed to upload image. Please try again.');
  }
};
```

### Fetch Bowling Types
```javascript
const fetchBowlingTypes = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/v1/bowling-types');
    const data = await response.json();
    
    if (response.ok) {
      setBowlingTypes(data.data);
    }
  } catch (error) {
    console.error('Failed to fetch bowling types:', error);
  }
};

// Use in dropdown/select
// Example: Fast (FAST), Fast Medium (FAST_MEDIUM), Off Spin (OFF_SPIN)
bowlingTypes.map(type => (
  <option key={type.id} value={type.id}>
    {type.fullName} ({type.shortName})
  </option>
));

// Note: Player's bowling hand (LEFT/RIGHT) is captured separately
```

---

## 🔄 State Management Recommendations

### User State
```javascript
{
  user: {
    id: string,
    email: string,
    name: string,
    role: string,
    isEmailVerified: boolean,
    hasPlayerProfile: boolean  // NEW: Check if player profile exists
  },
  player: {  // NEW: Player profile data (null if not exists)
    id: string,
    firstName: string,
    lastName: string,
    gender: string,
    playerType: string,
    batHand: string,
    bowlHand: string,
    // ... other player fields
  } | null,
  accessToken: string,
  refreshToken: string,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: string | null
}
```

### Registration Flow State
```javascript
{
  step: 'register' | 'verify-otp' | 'complete',
  email: string,
  otpSent: boolean,
  otpExpiry: Date,
  error: string | null,
  isLoading: boolean
}
```

### Player Profile State
```javascript
{
  player: {
    id: string,
    firstName: string,
    lastName: string,
    gender: string,
    dateOfBirth: Date,
    profilePicture: string | null,
    playerType: string,
    isWicketKeeper: boolean,
    batHand: string,
    bowlHand: string | null,
    address: AddressObject,
    bowlingTypes: BowlingType[],
    isActive: boolean
  } | null,
  hasPlayerProfile: boolean,
  isLoading: boolean,
  error: string | null
}
```

### Bowling Types State
```javascript
{
  bowlingTypes: [
    {
      id: string,
      shortName: string,
      fullName: string
    }
  ],
  isLoading: boolean,
  error: string | null
}
```

---

## 📞 Support

For any issues or questions regarding the API, please contact the backend team or refer to the complete technical documentation in `REGISTRATION_FLOW_NEW.md`.

---

## 📋 Quick Reference Summary

### Authentication Endpoints
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/v1/auth/register` | No | Create account (pending) |
| POST | `/api/v1/auth/verify-email` | No | Verify OTP and create user |
| POST | `/api/v1/auth/resend-verification-otp` | No | Resend verification OTP |
| POST | `/api/v1/auth/login` | No | Login and get tokens |
| POST | `/api/v1/auth/refresh` | Yes | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | No | Request password reset OTP |
| POST | `/api/v1/auth/reset-password` | No | Reset password with OTP |
| GET | `/api/v1/auth/me` | Yes | Get current user |

### Player Endpoints
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/v1/bowling-types` | No | Get bowling types |
| POST | `/api/v1/players/upload-profile-picture` | Yes | Upload profile picture |
| POST | `/api/v1/players/register` | Yes | Create player profile |
| GET | `/api/v1/players` | Yes | Get all players (with filters) |
| GET | `/api/v1/players/:id` | Yes | Get player by ID |
| PUT | `/api/v1/players/:id` | Yes | Update player profile |
| DELETE | `/api/v1/players/:id` | Yes | Deactivate player |

---

**Last Updated:** January 11, 2026  
**API Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api/v1`
