--
-- PostgreSQL database dump
--

\restrict QMnNT8CBBOJ440cb3wZelxJYVR23eSbTETsnuBbiD1dH9JbnvqR60Vjb3jgc4PZ

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: BallType; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."BallType" AS ENUM (
    'LEATHER',
    'TENNIS_TAPE'
);


ALTER TYPE public."BallType" OWNER TO root;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER'
);


ALTER TYPE public."Gender" OWNER TO root;

--
-- Name: Hand; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."Hand" AS ENUM (
    'LEFT',
    'RIGHT'
);


ALTER TYPE public."Hand" OWNER TO root;

--
-- Name: InvitationStatus; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."InvitationStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN'
);


ALTER TYPE public."InvitationStatus" OWNER TO root;

--
-- Name: MatchFormat; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."MatchFormat" AS ENUM (
    'T20',
    'ODI',
    'TEST',
    'CUSTOM'
);


ALTER TYPE public."MatchFormat" OWNER TO root;

--
-- Name: MatchStatus; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."MatchStatus" AS ENUM (
    'SCHEDULED',
    'TOSS',
    'IN_PROGRESS',
    'DELAYED',
    'BREAK',
    'ABANDONED',
    'COMPLETED'
);


ALTER TYPE public."MatchStatus" OWNER TO root;

--
-- Name: PlayerRole; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."PlayerRole" AS ENUM (
    'PLAYER',
    'CAPTAIN',
    'VICE_CAPTAIN'
);


ALTER TYPE public."PlayerRole" OWNER TO root;

--
-- Name: PlayerType; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."PlayerType" AS ENUM (
    'BATSMAN',
    'BOWLER',
    'ALL_ROUNDER'
);


ALTER TYPE public."PlayerType" OWNER TO root;

--
-- Name: TossDecision; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."TossDecision" AS ENUM (
    'BAT',
    'FIELD'
);


ALTER TYPE public."TossDecision" OWNER TO root;

--
-- Name: TournamentStatus; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."TournamentStatus" AS ENUM (
    'DRAFT',
    'ONGOING',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."TournamentStatus" OWNER TO root;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."UserRole" AS ENUM (
    'USER',
    'ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO root;

--
-- Name: WicketType; Type: TYPE; Schema: public; Owner: root
--

CREATE TYPE public."WicketType" AS ENUM (
    'NONE',
    'BOWLED',
    'CAUGHT',
    'STUMPED',
    'RUN_OUT',
    'LBW',
    'HIT_WICKET',
    'RETIRED_OUT'
);


ALTER TYPE public."WicketType" OWNER TO root;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO root;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.addresses (
    id text NOT NULL,
    street text,
    "townSuburb" text,
    city text NOT NULL,
    state text NOT NULL,
    country text NOT NULL,
    "postalCode" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.addresses OWNER TO root;

--
-- Name: balls; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.balls (
    id text NOT NULL,
    "overId" text NOT NULL,
    "ballNumber" integer NOT NULL,
    "batsmanId" text,
    "nonStrikerId" text,
    "bowlerId" text NOT NULL,
    runs integer DEFAULT 0 NOT NULL,
    "isWide" boolean DEFAULT false NOT NULL,
    "wideRuns" integer DEFAULT 0 NOT NULL,
    "isNoBall" boolean DEFAULT false NOT NULL,
    "noBallRuns" integer DEFAULT 0 NOT NULL,
    "isBye" boolean DEFAULT false NOT NULL,
    "byeRuns" integer DEFAULT 0 NOT NULL,
    "isLegBye" boolean DEFAULT false NOT NULL,
    "legByeRuns" integer DEFAULT 0 NOT NULL,
    "wicketType" public."WicketType" DEFAULT 'NONE'::public."WicketType" NOT NULL,
    "wicketPlayerId" text,
    "dismissedBatsmanId" text,
    "isDotBall" boolean DEFAULT false NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.balls OWNER TO root;

--
-- Name: bowling_types; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.bowling_types (
    id text NOT NULL,
    "shortName" text NOT NULL,
    "fullName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.bowling_types OWNER TO root;

--
-- Name: clubs; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.clubs (
    id text NOT NULL,
    name text NOT NULL,
    "profilePicture" text,
    bio text,
    "establishedDate" timestamp(3) without time zone,
    "addressId" text NOT NULL,
    "ownerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.clubs OWNER TO root;

--
-- Name: match_invitations; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.match_invitations (
    id text NOT NULL,
    "matchId" text NOT NULL,
    "teamId" text NOT NULL,
    status public."InvitationStatus" DEFAULT 'PENDING'::public."InvitationStatus" NOT NULL,
    "invitedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "invitationExpiresAt" timestamp(3) without time zone NOT NULL,
    "respondedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.match_invitations OWNER TO root;

--
-- Name: match_players; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.match_players (
    id text NOT NULL,
    "matchId" text NOT NULL,
    "playerId" text NOT NULL,
    "teamId" text NOT NULL,
    role public."PlayerRole",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.match_players OWNER TO root;

--
-- Name: match_results; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.match_results (
    id text NOT NULL,
    "matchId" text NOT NULL,
    "winningTeamId" text,
    "isTie" boolean DEFAULT false NOT NULL,
    "isAbandoned" boolean DEFAULT false NOT NULL,
    "team1Score" integer NOT NULL,
    "team1Wickets" integer NOT NULL,
    "team1Overs" numeric(10,2) NOT NULL,
    "team2Score" integer NOT NULL,
    "team2Wickets" integer NOT NULL,
    "team2Overs" numeric(10,2) NOT NULL,
    "resultDescription" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.match_results OWNER TO root;

--
-- Name: matches; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.matches (
    id text NOT NULL,
    "tournamentId" text,
    "team1Id" text NOT NULL,
    "team2Id" text NOT NULL,
    overs integer NOT NULL,
    "ballType" public."BallType" NOT NULL,
    format public."MatchFormat" NOT NULL,
    "customOvers" integer,
    status public."MatchStatus" DEFAULT 'SCHEDULED'::public."MatchStatus" NOT NULL,
    "scheduledDate" timestamp(3) without time zone NOT NULL,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "tossWinnerId" text,
    "tossDecision" public."TossDecision",
    "scorerId" text,
    "creatorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.matches OWNER TO root;

--
-- Name: overs; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.overs (
    id text NOT NULL,
    "matchId" text NOT NULL,
    "inningNumber" integer NOT NULL,
    "overNumber" integer NOT NULL,
    "bowlerId" text NOT NULL,
    "battingTeamId" text NOT NULL,
    "fieldingTeamId" text NOT NULL,
    runs integer DEFAULT 0 NOT NULL,
    extras integer DEFAULT 0 NOT NULL,
    wickets integer DEFAULT 0 NOT NULL,
    "isMaiden" boolean DEFAULT false NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.overs OWNER TO root;

--
-- Name: player_bowling_types; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.player_bowling_types (
    id text NOT NULL,
    "playerId" text NOT NULL,
    "bowlingTypeId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.player_bowling_types OWNER TO root;

--
-- Name: player_teams; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.player_teams (
    id text NOT NULL,
    "playerId" text NOT NULL,
    "teamId" text NOT NULL,
    status public."InvitationStatus" DEFAULT 'PENDING'::public."InvitationStatus" NOT NULL,
    "invitedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "invitationExpiresAt" timestamp(3) without time zone NOT NULL,
    "respondedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.player_teams OWNER TO root;

--
-- Name: players; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.players (
    id text NOT NULL,
    "userId" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    gender public."Gender" DEFAULT 'MALE'::public."Gender" NOT NULL,
    "dateOfBirth" timestamp(3) without time zone NOT NULL,
    "profilePicture" text,
    "playerType" public."PlayerType" NOT NULL,
    "isWicketKeeper" boolean DEFAULT false NOT NULL,
    "batHand" public."Hand" NOT NULL,
    "bowlHand" public."Hand",
    "addressId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.players OWNER TO root;

--
-- Name: points_table_entries; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.points_table_entries (
    id text NOT NULL,
    "pointsTableId" text NOT NULL,
    "teamId" text NOT NULL,
    "matchesPlayed" integer DEFAULT 0 NOT NULL,
    "matchesWon" integer DEFAULT 0 NOT NULL,
    "matchesLost" integer DEFAULT 0 NOT NULL,
    "matchesTied" integer DEFAULT 0 NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    "netRunRate" numeric(10,4) DEFAULT 0 NOT NULL,
    "runsScored" integer DEFAULT 0 NOT NULL,
    "runsConceded" integer DEFAULT 0 NOT NULL,
    "oversFaced" numeric(10,2) DEFAULT 0 NOT NULL,
    "oversBowled" numeric(10,2) DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.points_table_entries OWNER TO root;

--
-- Name: points_tables; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.points_tables (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.points_tables OWNER TO root;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.teams (
    id text NOT NULL,
    name text NOT NULL,
    logo text,
    description text,
    "clubId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.teams OWNER TO root;

--
-- Name: tournament_teams; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.tournament_teams (
    id text NOT NULL,
    "tournamentId" text NOT NULL,
    "teamId" text NOT NULL,
    status public."InvitationStatus" DEFAULT 'PENDING'::public."InvitationStatus" NOT NULL,
    "invitedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "invitationExpiresAt" timestamp(3) without time zone NOT NULL,
    "respondedAt" timestamp(3) without time zone,
    "withdrawnAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.tournament_teams OWNER TO root;

--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.tournaments (
    id text NOT NULL,
    name text NOT NULL,
    "coverPicture" text,
    "profilePicture" text,
    format public."MatchFormat" NOT NULL,
    "customOvers" integer,
    "creatorId" text NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    status public."TournamentStatus" DEFAULT 'DRAFT'::public."TournamentStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.tournaments OWNER TO root;

--
-- Name: users; Type: TABLE; Schema: public; Owner: root
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password text NOT NULL,
    role public."UserRole" DEFAULT 'USER'::public."UserRole" NOT NULL,
    "isEmailVerified" boolean DEFAULT false NOT NULL,
    "emailVerificationToken" text,
    "passwordResetToken" text,
    "passwordResetExpires" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public.users OWNER TO root;

--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: balls balls_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.balls
    ADD CONSTRAINT balls_pkey PRIMARY KEY (id);


--
-- Name: bowling_types bowling_types_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.bowling_types
    ADD CONSTRAINT bowling_types_pkey PRIMARY KEY (id);


--
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (id);


--
-- Name: match_invitations match_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.match_invitations
    ADD CONSTRAINT match_invitations_pkey PRIMARY KEY (id);


--
-- Name: match_players match_players_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT match_players_pkey PRIMARY KEY (id);


--
-- Name: match_results match_results_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: overs overs_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.overs
    ADD CONSTRAINT overs_pkey PRIMARY KEY (id);


--
-- Name: player_bowling_types player_bowling_types_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.player_bowling_types
    ADD CONSTRAINT player_bowling_types_pkey PRIMARY KEY (id);


--
-- Name: player_teams player_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.player_teams
    ADD CONSTRAINT player_teams_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: points_table_entries points_table_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.points_table_entries
    ADD CONSTRAINT points_table_entries_pkey PRIMARY KEY (id);


--
-- Name: points_tables points_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.points_tables
    ADD CONSTRAINT points_tables_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: tournament_teams tournament_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT tournament_teams_pkey PRIMARY KEY (id);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: bowling_types_shortName_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "bowling_types_shortName_key" ON public.bowling_types USING btree ("shortName");


--
-- Name: match_invitations_matchId_teamId_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "match_invitations_matchId_teamId_key" ON public.match_invitations USING btree ("matchId", "teamId");


--
-- Name: match_players_matchId_playerId_teamId_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "match_players_matchId_playerId_teamId_key" ON public.match_players USING btree ("matchId", "playerId", "teamId");


--
-- Name: match_results_matchId_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "match_results_matchId_key" ON public.match_results USING btree ("matchId");


--
-- Name: player_bowling_types_playerId_bowlingTypeId_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "player_bowling_types_playerId_bowlingTypeId_key" ON public.player_bowling_types USING btree ("playerId", "bowlingTypeId");


--
-- Name: player_teams_playerId_teamId_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "player_teams_playerId_teamId_key" ON public.player_teams USING btree ("playerId", "teamId");


--
-- Name: players_userId_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "players_userId_key" ON public.players USING btree ("userId");


--
-- Name: points_table_entries_pointsTableId_teamId_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "points_table_entries_pointsTableId_teamId_key" ON public.points_table_entries USING btree ("pointsTableId", "teamId");


--
-- Name: points_tables_tournamentId_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "points_tables_tournamentId_key" ON public.points_tables USING btree ("tournamentId");


--
-- Name: tournament_teams_tournamentId_teamId_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "tournament_teams_tournamentId_teamId_key" ON public.tournament_teams USING btree ("tournamentId", "teamId");


--
-- Name: users_emailVerificationToken_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON public.users USING btree ("emailVerificationToken");


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_passwordResetToken_key; Type: INDEX; Schema: public; Owner: root
--

CREATE UNIQUE INDEX "users_passwordResetToken_key" ON public.users USING btree ("passwordResetToken");


--
-- Name: balls balls_batsmanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.balls
    ADD CONSTRAINT "balls_batsmanId_fkey" FOREIGN KEY ("batsmanId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: balls balls_bowlerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.balls
    ADD CONSTRAINT "balls_bowlerId_fkey" FOREIGN KEY ("bowlerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: balls balls_dismissedBatsmanId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.balls
    ADD CONSTRAINT "balls_dismissedBatsmanId_fkey" FOREIGN KEY ("dismissedBatsmanId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: balls balls_nonStrikerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.balls
    ADD CONSTRAINT "balls_nonStrikerId_fkey" FOREIGN KEY ("nonStrikerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: balls balls_overId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.balls
    ADD CONSTRAINT "balls_overId_fkey" FOREIGN KEY ("overId") REFERENCES public.overs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: balls balls_wicketPlayerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.balls
    ADD CONSTRAINT "balls_wicketPlayerId_fkey" FOREIGN KEY ("wicketPlayerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clubs clubs_addressId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT "clubs_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES public.addresses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: clubs clubs_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT "clubs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: match_invitations match_invitations_matchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.match_invitations
    ADD CONSTRAINT "match_invitations_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_invitations match_invitations_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.match_invitations
    ADD CONSTRAINT "match_invitations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_players match_players_matchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT "match_players_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_players match_players_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT "match_players_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_players match_players_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.match_players
    ADD CONSTRAINT "match_players_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_results match_results_matchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT "match_results_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: match_results match_results_winningTeamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT "match_results_winningTeamId_fkey" FOREIGN KEY ("winningTeamId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: matches matches_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: matches matches_scorerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_scorerId_fkey" FOREIGN KEY ("scorerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: matches matches_team1Id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_team1Id_fkey" FOREIGN KEY ("team1Id") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: matches matches_team2Id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_team2Id_fkey" FOREIGN KEY ("team2Id") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: matches matches_tossWinnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_tossWinnerId_fkey" FOREIGN KEY ("tossWinnerId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: matches matches_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT "matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public.tournaments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: overs overs_battingTeamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.overs
    ADD CONSTRAINT "overs_battingTeamId_fkey" FOREIGN KEY ("battingTeamId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: overs overs_bowlerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.overs
    ADD CONSTRAINT "overs_bowlerId_fkey" FOREIGN KEY ("bowlerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: overs overs_fieldingTeamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.overs
    ADD CONSTRAINT "overs_fieldingTeamId_fkey" FOREIGN KEY ("fieldingTeamId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: overs overs_matchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.overs
    ADD CONSTRAINT "overs_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_bowling_types player_bowling_types_bowlingTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.player_bowling_types
    ADD CONSTRAINT "player_bowling_types_bowlingTypeId_fkey" FOREIGN KEY ("bowlingTypeId") REFERENCES public.bowling_types(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_bowling_types player_bowling_types_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.player_bowling_types
    ADD CONSTRAINT "player_bowling_types_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_teams player_teams_playerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.player_teams
    ADD CONSTRAINT "player_teams_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES public.players(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: player_teams player_teams_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.player_teams
    ADD CONSTRAINT "player_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: players players_addressId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT "players_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES public.addresses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: players players_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT "players_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: points_table_entries points_table_entries_pointsTableId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.points_table_entries
    ADD CONSTRAINT "points_table_entries_pointsTableId_fkey" FOREIGN KEY ("pointsTableId") REFERENCES public.points_tables(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: points_table_entries points_table_entries_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.points_table_entries
    ADD CONSTRAINT "points_table_entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: points_tables points_tables_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.points_tables
    ADD CONSTRAINT "points_tables_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public.tournaments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: teams teams_clubId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT "teams_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES public.clubs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tournament_teams tournament_teams_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT "tournament_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public.teams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tournament_teams tournament_teams_tournamentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.tournament_teams
    ADD CONSTRAINT "tournament_teams_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES public.tournaments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tournaments tournaments_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: root
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT "tournaments_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict QMnNT8CBBOJ440cb3wZelxJYVR23eSbTETsnuBbiD1dH9JbnvqR60Vjb3jgc4PZ

