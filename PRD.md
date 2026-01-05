# Cricket Scoring App - Product Requirements Document (PRD)

## 1. Overview

A comprehensive cricket scoring application built with NestJS, PostgreSQL, and Prisma. The application allows users to manage players, clubs, teams, tournaments, and live match scoring.

## 2. Technology Stack

- **Backend Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Caching**: Redis
- **Authentication**: JWT (to be implemented)
- **File Storage**: Local server storage (MVP), S3 (future)
- **Email Service**: Nodemailer with Google SMTP
- **API**: REST APIs (WebSocket/Socket.IO for live scores - future)

## 3. Database Schema Design

### 3.1 Core Entities

#### User
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `name` (String)
- `password` (String, Hashed)
- `role` (Enum: USER, ADMIN)
- `isEmailVerified` (Boolean, default: false)
- `emailVerificationToken` (String, nullable)
- `passwordResetToken` (String, nullable)
- `passwordResetExpires` (DateTime, nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime, nullable, soft delete)

**Relationships:**
- One-to-One with Player
- One-to-Many with Club (as owner)
- One-to-Many with Tournament (as creator)
- One-to-Many with Match (as creator/scorer)

#### Player
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key → User, Unique)
- `firstName` (String)
- `lastName` (String)
- `gender` (Enum: MALE, FEMALE, OTHER, default: MALE)
- `dateOfBirth` (Date)
- `profilePicture` (String, nullable, file path)
- `playerType` (Enum: BATSMAN, BOWLER, ALL_ROUNDER)
- `isWicketKeeper` (Boolean, default: false)
- `batHand` (Enum: LEFT, RIGHT)
- `bowlHand` (Enum: LEFT, RIGHT, nullable - only for BOWLER and ALL_ROUNDER)
- `addressId` (UUID, Foreign Key → Address)
- `isActive` (Boolean, default: true)
- `deletedAt` (DateTime, nullable, soft delete)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- Many-to-Many with Team (through PlayerTeam)
- Many-to-Many with BowlingType (through PlayerBowlingType)
- One-to-Many with MatchPlayer (player participation in matches)

#### BowlingType
- `id` (UUID, Primary Key)
- `shortName` (String, Unique, e.g., "FAST", "MEDIUM", "OFF_SPIN")
- `fullName` (String, e.g., "Fast Bowling", "Medium Pace", "Off Spin")
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- Many-to-Many with Player (through PlayerBowlingType)

#### PlayerBowlingType
- `id` (UUID, Primary Key)
- `playerId` (UUID, Foreign Key → Player)
- `bowlingTypeId` (UUID, Foreign Key → BowlingType)
- `createdAt` (DateTime)

#### Address
- `id` (UUID, Primary Key)
- `street` (String, nullable)
- `townSuburb` (String, nullable)
- `city` (String)
- `state` (String)
- `country` (String)
- `postalCode` (String, nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- One-to-Many with Player
- One-to-Many with Club

#### Club
- `id` (UUID, Primary Key)
- `name` (String)
- `profilePicture` (String, nullable, file path)
- `bio` (String, nullable, Text)
- `establishedDate` (Date, nullable)
- `addressId` (UUID, Foreign Key → Address)
- `ownerId` (UUID, Foreign Key → User)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime, nullable, soft delete)

**Relationships:**
- One-to-Many with Team
- One-to-Many with TournamentTeam (through teams)

#### Team
- `id` (UUID, Primary Key)
- `name` (String)
- `logo` (String, nullable, file path)
- `description` (String, nullable, Text)
- `clubId` (UUID, Foreign Key → Club)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime, nullable, soft delete)

**Relationships:**
- Many-to-Many with Player (through PlayerTeam)
- Many-to-Many with Tournament (through TournamentTeam)
- One-to-Many with Match (as team1 and team2)

#### PlayerTeam
- `id` (UUID, Primary Key)
- `playerId` (UUID, Foreign Key → Player)
- `teamId` (UUID, Foreign Key → Team)
- `status` (Enum: PENDING, ACCEPTED, REJECTED)
- `invitedAt` (DateTime)
- `invitationExpiresAt` (DateTime)
- `respondedAt` (DateTime, nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

#### Tournament
- `id` (UUID, Primary Key)
- `name` (String)
- `coverPicture` (String, nullable, file path)
- `profilePicture` (String, nullable, file path)
- `format` (Enum: T20, ODI, TEST, CUSTOM)
- `customOvers` (Integer, nullable, only if format is CUSTOM)
- `creatorId` (UUID, Foreign Key → User)
- `startDate` (DateTime, nullable)
- `endDate` (DateTime, nullable)
- `status` (Enum: DRAFT, ONGOING, COMPLETED, CANCELLED)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime, nullable, soft delete)

**Relationships:**
- One-to-Many with Match
- Many-to-Many with Team (through TournamentTeam)
- One-to-One with PointsTable

#### TournamentTeam
- `id` (UUID, Primary Key)
- `tournamentId` (UUID, Foreign Key → Tournament)
- `teamId` (UUID, Foreign Key → Team)
- `status` (Enum: PENDING, ACCEPTED, REJECTED, WITHDRAWN)
- `invitedAt` (DateTime)
- `invitationExpiresAt` (DateTime)
- `respondedAt` (DateTime, nullable)
- `withdrawnAt` (DateTime, nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

#### PointsTable
- `id` (UUID, Primary Key)
- `tournamentId` (UUID, Foreign Key → Tournament, Unique)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- One-to-Many with PointsTableEntry

#### PointsTableEntry
- `id` (UUID, Primary Key)
- `pointsTableId` (UUID, Foreign Key → PointsTable)
- `teamId` (UUID, Foreign Key → Team)
- `matchesPlayed` (Integer, default: 0)
- `matchesWon` (Integer, default: 0)
- `matchesLost` (Integer, default: 0)
- `matchesTied` (Integer, default: 0)
- `points` (Integer, default: 0)
- `netRunRate` (Decimal, default: 0.0)
- `runsScored` (Integer, default: 0)
- `runsConceded` (Integer, default: 0)
- `oversFaced` (Decimal, default: 0.0)
- `oversBowled` (Decimal, default: 0.0)
- `updatedAt` (DateTime)

#### Match
- `id` (UUID, Primary Key)
- `tournamentId` (UUID, Foreign Key → Tournament, nullable - null for quick matches)
- `team1Id` (UUID, Foreign Key → Team)
- `team2Id` (UUID, Foreign Key → Team)
- `overs` (Integer)
- `ballType` (Enum: LEATHER, TENNIS_TAPE)
- `format` (Enum: T20, ODI, TEST, CUSTOM)
- `customOvers` (Integer, nullable)
- `status` (Enum: SCHEDULED, TOSS, IN_PROGRESS, DELAYED, BREAK, ABANDONED, COMPLETED)
- `scheduledDate` (DateTime)
- `startedAt` (DateTime, nullable)
- `completedAt` (DateTime, nullable)
- `tossWinnerId` (UUID, Foreign Key → Team, nullable)
- `tossDecision` (Enum: BAT, FIELD, nullable)
- `scorerId` (UUID, Foreign Key → User, nullable)
- `creatorId` (UUID, Foreign Key → User)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `deletedAt` (DateTime, nullable, soft delete)

**Relationships:**
- One-to-Many with MatchTeam (team1 and team2)
- One-to-Many with MatchPlayer
- One-to-Many with MatchInvitation
- One-to-Many with Over
- One-to-One with MatchResult

#### MatchInvitation
- `id` (UUID, Primary Key)
- `matchId` (UUID, Foreign Key → Match)
- `teamId` (UUID, Foreign Key → Team)
- `status` (Enum: PENDING, ACCEPTED, REJECTED)
- `invitedAt` (DateTime)
- `invitationExpiresAt` (DateTime)
- `respondedAt` (DateTime, nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

#### MatchPlayer
- `id` (UUID, Primary Key)
- `matchId` (UUID, Foreign Key → Match)
- `playerId` (UUID, Foreign Key → Player)
- `teamId` (UUID, Foreign Key → Team)
- `role` (Enum: PLAYER, CAPTAIN, VICE_CAPTAIN, nullable)
- `createdAt` (DateTime)

#### Over
- `id` (UUID, Primary Key)
- `matchId` (UUID, Foreign Key → Match)
- `inningNumber` (Integer, 1 or 2)
- `overNumber` (Integer, 1-based)
- `bowlerId` (UUID, Foreign Key → Player)
- `battingTeamId` (UUID, Foreign Key → Team)
- `fieldingTeamId` (UUID, Foreign Key → Team)
- `runs` (Integer, default: 0)
- `extras` (Integer, default: 0)
- `wickets` (Integer, default: 0)
- `isMaiden` (Boolean, default: false)
- `startedAt` (DateTime)
- `completedAt` (DateTime, nullable)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**Relationships:**
- One-to-Many with Ball

#### Ball
- `id` (UUID, Primary Key)
- `overId` (UUID, Foreign Key → Over)
- `ballNumber` (Integer, 1-6)
- `batsmanId` (UUID, Foreign Key → Player, nullable - for run out scenarios)
- `nonStrikerId` (UUID, Foreign Key → Player, nullable)
- `bowlerId` (UUID, Foreign Key → Player)
- `runs` (Integer, default: 0)
- `isWide` (Boolean, default: false)
- `wideRuns` (Integer, default: 0, additional runs on wide)
- `isNoBall` (Boolean, default: false)
- `noBallRuns` (Integer, default: 0, additional runs on no ball)
- `isBye` (Boolean, default: false)
- `byeRuns` (Integer, default: 0)
- `isLegBye` (Boolean, default: false)
- `legByeRuns` (Integer, default: 0)
- `wicketType` (Enum: NONE, BOWLED, CAUGHT, STUMPED, RUN_OUT, LBW, HIT_WICKET, RETIRED_OUT, nullable)
- `wicketPlayerId` (UUID, Foreign Key → Player, nullable, player who got out)
- `dismissedBatsmanId` (UUID, Foreign Key → Player, nullable)
- `isDotBall` (Boolean, default: false)
- `timestamp` (DateTime)
- `createdAt` (DateTime)

#### MatchResult
- `id` (UUID, Primary Key)
- `matchId` (UUID, Foreign Key → Match, Unique)
- `winningTeamId` (UUID, Foreign Key → Team, nullable)
- `isTie` (Boolean, default: false)
- `isAbandoned` (Boolean, default: false)
- `team1Score` (Integer)
- `team1Wickets` (Integer)
- `team1Overs` (Decimal)
- `team2Score` (Integer)
- `team2Wickets` (Integer)
- `team2Overs` (Decimal)
- `resultDescription` (String, nullable, Text)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### 3.2 Enums

```prisma
enum UserRole {
  USER
  ADMIN
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum PlayerType {
  BATSMAN
  BOWLER
  ALL_ROUNDER
}

enum Hand {
  LEFT
  RIGHT
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  REJECTED
  WITHDRAWN
}

enum TournamentStatus {
  DRAFT
  ONGOING
  COMPLETED
  CANCELLED
}

enum MatchFormat {
  T20
  ODI
  TEST
  CUSTOM
}

enum BallType {
  LEATHER
  TENNIS_TAPE
}

enum MatchStatus {
  SCHEDULED
  TOSS
  IN_PROGRESS
  DELAYED
  BREAK
  ABANDONED
  COMPLETED
}

enum TossDecision {
  BAT
  FIELD
}

enum WicketType {
  NONE
  BOWLED
  CAUGHT
  STUMPED
  RUN_OUT
  LBW
  HIT_WICKET
  RETIRED_OUT
}
```

## 4. API Endpoints Structure

### 4.1 Authentication Module (`/api/v1/auth`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login (returns JWT)
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - Logout
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/verify-email` - Verify email with token
- `GET /auth/me` - Get current user profile

### 4.2 Player Module (`/api/v1/players`)
- `POST /players/register` - Register as player (authenticated user)
- `GET /players` - List all active players (with filters: city, state, country, playerType, etc.)
- `GET /players/:id` - Get player details
- `PUT /players/:id` - Update player profile (own profile only)
- `DELETE /players/:id` - Deactivate player profile (soft delete)
- `GET /players/:id/stats` - Get player statistics (future)

### 4.3 Club Module (`/api/v1/clubs`)
- `POST /clubs` - Create club (authenticated user)
- `GET /clubs` - List all clubs (with filters)
- `GET /clubs/:id` - Get club details
- `PUT /clubs/:id` - Update club (owner only)
- `DELETE /clubs/:id` - Delete club (owner only, soft delete)
- `GET /clubs/:id/teams` - Get all teams of a club

### 4.4 Team Module (`/api/v1/teams`)
- `POST /teams` - Create team (club owner)
- `GET /teams` - List all teams (with filters)
- `GET /teams/:id` - Get team details
- `PUT /teams/:id` - Update team (club owner)
- `DELETE /teams/:id` - Delete team (club owner, soft delete)
- `POST /teams/:id/players` - Add player to team (sends invitation)
- `GET /teams/:id/players` - Get all players of a team
- `DELETE /teams/:id/players/:playerId` - Remove player from team
- `GET /teams/:id/invitations` - Get team invitations (for players)
- `POST /teams/:id/invitations/:invitationId/accept` - Accept team invitation
- `POST /teams/:id/invitations/:invitationId/reject` - Reject team invitation

### 4.5 Tournament Module (`/api/v1/tournaments`)
- `POST /tournaments` - Create tournament (authenticated user)
- `GET /tournaments` - List all tournaments (with filters)
- `GET /tournaments/:id` - Get tournament details
- `PUT /tournaments/:id` - Update tournament (creator only)
- `DELETE /tournaments/:id` - Delete tournament (creator only, soft delete)
- `POST /tournaments/:id/teams` - Add team to tournament (sends invitation)
- `GET /tournaments/:id/teams` - Get all teams in tournament
- `DELETE /tournaments/:id/teams/:teamId` - Remove team from tournament
- `POST /tournaments/:id/teams/:teamId/withdraw` - Team withdraws from tournament
- `GET /tournaments/:id/invitations` - Get tournament invitations (for team owners)
- `POST /tournaments/:id/invitations/:invitationId/accept` - Accept tournament invitation
- `POST /tournaments/:id/invitations/:invitationId/reject` - Reject tournament invitation
- `GET /tournaments/:id/points-table` - Get tournament points table
- `GET /tournaments/:id/matches` - Get all matches in tournament
- `GET /tournaments/:id/stats` - Get tournament statistics (future)

### 4.6 Match Module (`/api/v1/matches`)
- `POST /matches/quick` - Create quick match (authenticated user)
- `POST /matches` - Create tournament match (tournament creator)
- `GET /matches` - List all matches (with filters)
- `GET /matches/:id` - Get match details
- `PUT /matches/:id` - Update match (creator only, before match starts)
- `DELETE /matches/:id` - Delete match (creator only, before match starts)
- `POST /matches/:id/invite` - Send match invitations to teams
- `GET /matches/:id/invitations` - Get match invitations
- `POST /matches/:id/invitations/:invitationId/accept` - Accept match invitation
- `POST /matches/:id/invitations/:invitationId/reject` - Reject match invitation
- `POST /matches/:id/scorer` - Assign scorer to match (creator only)
- `POST /matches/:id/start` - Start match (scorer only)
- `POST /matches/:id/toss` - Record toss result (scorer only)
- `POST /matches/:id/batters` - Set initial batters (scorer only)
- `POST /matches/:id/bowler` - Set bowler (scorer only)
- `POST /matches/:id/ball` - Record a ball (scorer only)
- `POST /matches/:id/over/complete` - Complete an over (scorer only)
- `POST /matches/:id/innings/switch` - Switch innings (scorer only)
- `POST /matches/:id/complete` - Complete match (scorer only)
- `GET /matches/:id/scorecard` - Get live scorecard
- `GET /matches/:id/result` - Get match result

### 4.7 Scoring Module (`/api/v1/scoring`)
- `GET /scoring/matches/:id/live` - Get live match data (for WebSocket later)
- `POST /scoring/matches/:id/runs` - Record runs (1, 2, 3, 4, 6)
- `POST /scoring/matches/:id/wide` - Record wide (wd, wd2, wd3, wd4)
- `POST /scoring/matches/:id/noball` - Record no ball (nb, nb1, nb2, ..., nb6)
- `POST /scoring/matches/:id/bye` - Record bye (bye1, bye2, bye3, bye4)
- `POST /scoring/matches/:id/legbye` - Record leg bye
- `POST /scoring/matches/:id/wicket` - Record wicket
- `POST /scoring/matches/:id/change-strike` - Change strike
- `POST /scoring/matches/:id/change-bowler` - Change bowler
- `POST /scoring/matches/:id/change-batter` - Change batter (retired hurt, etc.)

### 4.8 File Upload Module (`/api/v1/upload`)
- `POST /upload/profile-picture` - Upload profile picture (player/club/team)
- `POST /upload/logo` - Upload logo (club/team)
- `POST /upload/tournament-cover` - Upload tournament cover picture
- `POST /upload/tournament-profile` - Upload tournament profile picture

### 4.9 Address Module (`/api/v1/addresses`)
- `GET /addresses/cities` - Get list of cities (for filters)
- `GET /addresses/states` - Get list of states (for filters)
- `GET /addresses/countries` - Get list of countries (for filters)

### 4.10 Bowling Types Module (`/api/v1/bowling-types`)
- `GET /bowling-types` - Get all bowling types

## 5. Business Logic & Rules

### 5.1 Player Registration
- User must be authenticated
- User can only have one active player profile
- If player profile is deactivated, user can create a new one
- Deactivated players are removed from teams and player lists but remain in match history

### 5.2 Team Invitations
- Invitation expires after 2 days (configurable)
- Player can be re-invited after rejection
- All invitations are tracked in PlayerTeam table
- Only club owner can invite players to their club's teams

### 5.3 Tournament Invitations
- Invitation expires after 7 days (configurable)
- Teams can be removed by tournament creator or withdraw themselves
- Only accepted teams can participate in matches
- Tournament creator can add teams before matches are created

### 5.4 Match Flow
1. **Creation**: Match is created with status SCHEDULED
2. **Invitations**: Invitations sent to both teams
3. **Acceptance**: Both teams must accept
4. **Scorer Assignment**: Creator assigns scorer (can be self or any user)
5. **Start**: Scorer starts match, status changes to TOSS
6. **Toss**: Scorer records toss result, status changes to IN_PROGRESS
7. **Batters & Bowler**: Scorer sets initial batters and bowler
8. **Scoring**: Scorer records balls, runs, wickets
9. **Completion**: Match completes, status changes to COMPLETED

### 5.5 Scoring Rules
- **wd4**: 1 wide + 4 runs = 5 total runs
- **wd2**: 1 wide + 2 runs = 3 total runs
- **nb4**: 1 no ball + 4 runs = 5 total runs
- **bye4**: 4 byes = 4 total runs
- Wides and no balls are counted as extras
- Byes and leg byes are counted as extras but not against bowler
- Dot balls: balls with 0 runs and no extras

### 5.6 Points Table Calculation
- Win: 2 points
- Tie: 1 point
- Loss: 0 points
- Net Run Rate (NRR): (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
- Points table updates automatically after each match completion

### 5.7 File Upload Rules
- Maximum file size: 1MB
- Allowed formats: jpg, jpeg, png, webp
- Files stored in: `uploads/{type}/{year}/{month}/{filename}`
- Types: profile-pictures, logos, tournament-covers, tournament-profiles

## 6. Configuration

### 6.1 Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cricket_spirit

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# Email (Google SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@cricketspirit.com

# File Upload
UPLOAD_MAX_SIZE=1048576
UPLOAD_ALLOWED_TYPES=jpg,jpeg,png,webp
UPLOAD_DIR=./uploads

# Invitations
TEAM_INVITATION_EXPIRY_DAYS=2
TOURNAMENT_INVITATION_EXPIRY_DAYS=7
MATCH_INVITATION_EXPIRY_DAYS=3

# App
PORT=3000
NODE_ENV=development
```

## 7. Module Structure

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── jwt-refresh.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   └── decorators/
│       ├── current-user.decorator.ts
│       └── roles.decorator.ts
├── player/
│   ├── player.module.ts
│   ├── player.controller.ts
│   ├── player.service.ts
│   └── dtos/
├── club/
│   ├── club.module.ts
│   ├── club.controller.ts
│   ├── club.service.ts
│   └── dtos/
├── team/
│   ├── team.module.ts
│   ├── team.controller.ts
│   ├── team.service.ts
│   └── dtos/
├── tournament/
│   ├── tournament.module.ts
│   ├── tournament.controller.ts
│   ├── tournament.service.ts
│   ├── points-table.service.ts
│   └── dtos/
├── match/
│   ├── match.module.ts
│   ├── match.controller.ts
│   ├── match.service.ts
│   └── dtos/
├── scoring/
│   ├── scoring.module.ts
│   ├── scoring.controller.ts
│   ├── scoring.service.ts
│   └── dtos/
├── upload/
│   ├── upload.module.ts
│   ├── upload.controller.ts
│   ├── upload.service.ts
│   └── interceptors/
│       └── file-upload.interceptor.ts
├── address/
│   ├── address.module.ts
│   ├── address.service.ts
│   └── dtos/
├── bowling-type/
│   ├── bowling-type.module.ts
│   ├── bowling-type.service.ts
│   └── dtos/
└── common/
    ├── email/
    │   ├── email.module.ts
    │   └── email.service.ts
    └── ...
```

## 8. Implementation Phases

### Phase 1: Foundation
1. Update Prisma schema with all entities
2. Run migrations
3. Implement authentication (JWT)
4. Implement file upload service
5. Implement email service

### Phase 2: Core Entities
1. Player module (CRUD + registration)
2. Address module
3. Bowling types module (seed data)
4. Club module
5. Team module (with invitations)

### Phase 3: Tournaments & Matches
1. Tournament module (with team invitations)
2. Points table calculation
3. Match module (creation, invitations)
4. Match result tracking

### Phase 4: Scoring
1. Scoring service
2. Ball-by-ball tracking
3. Over management
4. Innings switching
5. Match completion

### Phase 5: Statistics (Future)
1. Player statistics
2. Tournament statistics
3. Team statistics

### Phase 6: Real-time (Future)
1. WebSocket/Socket.IO setup
2. Live score updates
3. Real-time match events

## 9. Testing Strategy

- Unit tests for services
- Integration tests for API endpoints
- E2E tests for critical flows (match scoring, tournament creation)
- Test coverage target: 80%

## 10. Security Considerations

- Password hashing with bcrypt
- JWT token expiration
- Rate limiting on authentication endpoints
- File upload validation (type, size)
- SQL injection prevention (Prisma)
- XSS prevention
- CORS configuration
- Input validation with class-validator

## 11. Future Enhancements

- WebSocket for live scores
- Player statistics tracking
- Tournament statistics
- Match highlights
- Player rankings
- Team rankings
- Cloud storage (S3) for files
- Push notifications
- Mobile app API
- Admin dashboard APIs

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Development

