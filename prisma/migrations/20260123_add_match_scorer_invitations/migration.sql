-- CreateTable
CREATE TABLE "match_scorer_invitations" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "scorerId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitationExpiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_scorer_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_scorer_invitations_matchId_scorerId_key" ON "match_scorer_invitations"("matchId", "scorerId");

-- AddForeignKey
ALTER TABLE "match_scorer_invitations" ADD CONSTRAINT "match_scorer_invitations_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_scorer_invitations" ADD CONSTRAINT "match_scorer_invitations_scorerId_fkey" FOREIGN KEY ("scorerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
