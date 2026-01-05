# Cricket Spirit API - Postman Collection

This directory contains Postman collections for testing the Cricket Spirit Backend API.

## Files

1. **Cricket-Spirit-API.postman_collection.json** - Complete API collection with all endpoints
2. **Cricket-Spirit-Environment.postman_environment.json** - Environment variables for local development

## Setup Instructions

### 1. Import Collection

1. Open Postman
2. Click **Import** button (top left)
3. Select `Cricket-Spirit-API.postman_collection.json`
4. Click **Import**

### 2. Import Environment

1. Click **Environments** (left sidebar)
2. Click **Import**
3. Select `Cricket-Spirit-Environment.postman_environment.json`
4. Click **Import**
5. Select the imported environment from the dropdown (top right)

### 3. Update Environment Variables

1. Click the environment dropdown (top right)
2. Click the **eye icon** to view variables
3. Update `base_url` if your server runs on a different port
   - Default: `http://localhost:3000`

## Testing Flow

### Phase 1: Authentication & Setup

1. **Register User** - Create a new user account
2. **Login** - Get access and refresh tokens (auto-saved to environment)
3. **Get Current User** - Verify authentication works

### Phase 2: Create Core Entities

1. **Create Address** - Create an address (save `address_id` to environment)
2. **Get Bowling Types** - Get available bowling types (save IDs for player registration)
3. **Register as Player** - Register current user as a player (save `player_id`)
4. **Create Club** - Create a club (save `club_id`)
5. **Create Team** - Create a team under the club (save `team_id`)

### Phase 3: Tournaments & Matches

1. **Create Tournament** - Create a tournament (save `tournament_id`)
2. **Add Team to Tournament** - Add team to tournament (get `invitation_id` from response)
3. **Accept Tournament Invitation** - Accept invitation as team owner
4. **Create Match** - Create a match in tournament (save `match_id`)
5. **Assign Scorer** - Assign scorer to match
6. **Accept Match Invitations** - Accept match invitations from both teams

### Phase 4: Scoring

1. **Start Match** - Start the match (changes status to TOSS)
2. **Record Toss** - Record toss result (changes status to IN_PROGRESS)
3. **Start Over** - Start first over with bowler and batsmen
4. **Score Balls** - Score multiple balls (normal runs, wides, no-balls, wickets)
5. **Complete Over** - Complete the over (or let it auto-complete after 6 legal balls)
6. **Continue Scoring** - Continue scoring more overs
7. **Switch Innings** - Switch to second innings after completing first
8. **Complete Match** - Complete match and generate result
9. **Get Match Result** - View final match result

## Collection Structure

The collection is organized into 9 folders:

1. **Authentication** - User registration, login, token management
2. **Players** - Player registration, CRUD, profile picture upload
3. **Address** - Address creation and filtering (countries, states, cities, towns)
4. **Bowling Types** - Get available bowling types
5. **Clubs** - Club CRUD, profile picture upload, team listing
6. **Teams** - Team CRUD, logo upload, player invitations
7. **Tournaments** - Tournament CRUD, team management, points table
8. **Matches** - Match CRUD, scorer assignment, toss recording
9. **Scoring** - Ball-by-ball scoring, over management, match completion

## Environment Variables

The collection uses the following variables:

- `base_url` - API base URL (default: http://localhost:3000)
- `access_token` - JWT access token (auto-set on login)
- `refresh_token` - JWT refresh token (auto-set on login)
- `user_id` - Current user ID (manual)
- `player_id` - Player ID (manual)
- `address_id` - Address ID (manual)
- `club_id` - Club ID (manual)
- `team_id` - Team ID (manual)
- `tournament_id` - Tournament ID (manual)
- `match_id` - Match ID (manual)
- `invitation_id` - Invitation ID (manual)

## Sample Request Bodies

All request bodies in the collection contain sample data. Update the values with your actual data:

- Replace placeholder IDs (e.g., `player-id-here`) with actual IDs from previous responses
- Update dates to future dates
- Use valid enum values (e.g., `MALE`, `FEMALE`, `BATSMAN`, `BOWLER`, etc.)

## Authentication

Most endpoints require authentication. The collection automatically:

1. Sets `access_token` on successful login
2. Uses `access_token` in Authorization header for protected endpoints

If your token expires, use the **Refresh Token** endpoint to get a new access token.

## Notes

- File uploads (profile pictures, logos, tournament covers) require selecting a file in Postman
- Maximum file size: 1MB
- Allowed formats: jpg, jpeg, png, webp
- Dates should be in ISO 8601 format (e.g., `2024-06-15T10:00:00.000Z`)
- IDs in path variables (e.g., `:id`, `:matchId`) need to be replaced with actual IDs
- Some endpoints require specific roles or ownership (e.g., club owner, scorer)

## Troubleshooting

### 401 Unauthorized
- Check if `access_token` is set in environment
- Try refreshing the token using **Refresh Token** endpoint
- Verify you're logged in with correct credentials

### 403 Forbidden
- Verify you have the required permissions (e.g., club owner, scorer)
- Check if you're using the correct user account

### 404 Not Found
- Verify IDs in path variables are correct
- Check if the resource exists in the database

### 400 Bad Request
- Verify request body format is correct
- Check if required fields are provided
- Validate enum values are correct
- Check date formats

## Support

For issues or questions, refer to the API documentation or check the backend logs.

