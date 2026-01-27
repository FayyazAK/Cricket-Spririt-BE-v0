# Match Creation Flow

This document describes the end-to-end flow for creating a match and handling related invitations (teams and scorer).

## Overview
1. **Create match** (optionally choose a scorer).
2. **Team invitations** created for both teams.
3. **Scorer invitation** created if scorer is not the creator.
4. **Invitations accepted/rejected** by teams and scorer.
5. **Start match** only after all required invites are accepted.
6. **Record toss** to move match to `IN_PROGRESS`.

---

## Match Creation

### Endpoint
```
POST /api/v1/matches
Authorization: Bearer <accessToken>
```

### Request Body
```json
{
  "tournamentId": "uuid (optional)",
  "scorerId": "uuid (optional, defaults to creator)",
  "team1Id": "uuid (required)",
  "team2Id": "uuid (required)",
  "overs": 20,
  "ballType": "LEATHER | TENNIS_TAPE",
  "format": "T20 | ODI | TEST | CUSTOM",
  "customOvers": 15,
  "scheduledDate": "2026-01-30T10:00:00.000Z"
}
```

### Notes
- If `scorerId` is omitted, the match creator is the scorer.
- If `format` is `CUSTOM`, `customOvers` is required.
- Overs must be within the configured range (default 2–50).
- If `tournamentId` is provided, both teams must be accepted participants.

### Success Response (201)
```json
{
  "message": "Match created successfully",
  "data": {
    "id": "match-uuid",
    "team1": { "id": "team-1", "name": "Team A" },
    "team2": { "id": "team-2", "name": "Team B" },
    "scorerId": "user-uuid",
    "status": "SCHEDULED"
  }
}
```

---

## Team Invitations (Created Automatically)
When a match is created, invitations are created for both teams.

### Get Team Invitations for a Match
```
GET /api/v1/matches/:id/invitations
Authorization: Bearer <accessToken>
```

### Accept Team Invitation
```
POST /api/v1/matches/invitations/:invitationId/accept
Authorization: Bearer <accessToken>
```

### Reject Team Invitation
```
POST /api/v1/matches/invitations/:invitationId/reject
Authorization: Bearer <accessToken>
```

---

## Scorer Invitation (If Scorer Is Not Creator)
If `scorerId` is someone else, a scorer invitation is created.

### Get My Scorer Invitations
```
GET /api/v1/matches/scorer-invitations
Authorization: Bearer <accessToken>
```

### Accept Scorer Invitation
```
POST /api/v1/matches/scorer-invitations/:invitationId/accept
Authorization: Bearer <accessToken>
```

### Reject Scorer Invitation
```
POST /api/v1/matches/scorer-invitations/:invitationId/reject
Authorization: Bearer <accessToken>
```

---

## Assign / Reassign Scorer (Before Start)

### Endpoint
```
POST /api/v1/matches/:id/scorer
Authorization: Bearer <accessToken>
```

### Request Body
```json
{
  "scorerId": "uuid"
}
```

### Rules
- Only the **match creator** can assign/reassign the scorer.
- Allowed **only when match status is `SCHEDULED`**.
- If reassigning to creator, **no invitation is created**.
- Reassigning to another scorer **withdraws old scorer invitations** and creates a new one.

---

## Start Match (Gate Conditions)

### Endpoint
```
POST /api/v1/matches/:id/start
Authorization: Bearer <accessToken>
```

### Rules
- Only the assigned scorer can start.
- Both team invitations must be **ACCEPTED**.
- If scorer is not the creator, scorer invitation must be **ACCEPTED**.

---

## Record Toss (Move to In Progress)

### Endpoint
```
POST /api/v1/matches/:id/toss
Authorization: Bearer <accessToken>
```

### Request Body
```json
{
  "tossWinnerId": "team-uuid",
  "tossDecision": "BAT | FIELD"
}
```

---

## Other Helpful Endpoints
```
GET /api/v1/matches
GET /api/v1/matches/:id
PUT /api/v1/matches/:id
DELETE /api/v1/matches/:id
GET /api/v1/matches/:id/result
```
