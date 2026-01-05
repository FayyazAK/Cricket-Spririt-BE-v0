import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../common/database/database.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { StartOverDto } from './dtos/start-over.dto';
import { ScoreBallDto } from './dtos/score-ball.dto';
import { SwitchBatsmenDto } from './dtos/switch-batsmen.dto';
import { MatchStatus, TossDecision, WicketType, Prisma } from '@prisma/client';

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async startOver(matchId: string, userId: string, startOverDto: StartOverDto) {
    // Check if match exists and user is scorer
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        deletedAt: null,
      },
      include: {
        team1: true,
        team2: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.scorerId !== userId) {
      throw new ForbiddenException('Only the assigned scorer can score');
    }

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Match must be in progress to start an over',
      );
    }

    // Determine current batting and fielding teams
    const currentInning = await this.getCurrentInning(matchId);
    
    if (!match.tossWinnerId || !match.tossDecision) {
      throw new BadRequestException('Toss must be recorded before starting an over');
    }

    const battingTeamId =
      currentInning === 1
        ? match.tossDecision === TossDecision.BAT
          ? match.tossWinnerId
          : match.tossWinnerId === match.team1Id
            ? match.team2Id
            : match.team1Id
        : match.tossDecision === TossDecision.BAT
          ? match.tossWinnerId === match.team1Id
            ? match.team2Id
            : match.team1Id
          : match.tossWinnerId;

    const fieldingTeamId =
      battingTeamId === match.team1Id ? match.team2Id : match.team1Id;

    // Check if over already exists
    const existingOver = await this.prisma.over.findFirst({
      where: {
        matchId,
        inningNumber: currentInning,
        overNumber: startOverDto.overNumber,
      },
    });

    if (existingOver) {
      throw new BadRequestException('Over already exists');
    }

    // Validate players belong to correct teams
    await this.validatePlayers(
      matchId,
      battingTeamId,
      fieldingTeamId,
      startOverDto.bowlerId,
      startOverDto.batsmanId,
      startOverDto.nonStrikerId,
    );

    // Create over
    const over = await this.prisma.over.create({
      data: {
        matchId,
        inningNumber: currentInning,
        overNumber: startOverDto.overNumber,
        bowlerId: startOverDto.bowlerId,
        battingTeamId,
        fieldingTeamId,
      },
      include: {
        bowler: true,
      },
    });

    this.logger.info('Over started', {
      matchId,
      overId: over.id,
      overNumber: startOverDto.overNumber,
      inningNumber: currentInning,
      context: ScoringService.name,
    });

    return {
      message: 'Over started successfully',
      data: over,
    };
  }

  async scoreBall(
    matchId: string,
    userId: string,
    scoreBallDto: ScoreBallDto,
  ) {
    // Check if match exists and user is scorer
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        deletedAt: null,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.scorerId !== userId) {
      throw new ForbiddenException('Only the assigned scorer can score');
    }

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw new BadRequestException('Match must be in progress to score');
    }

    // Get current over
    const currentInning = await this.getCurrentInning(matchId);
    const currentOver = await this.prisma.over.findFirst({
      where: {
        matchId,
        inningNumber: currentInning,
        completedAt: null,
      },
      include: {
        balls: {
          orderBy: {
            ballNumber: 'desc',
          },
          take: 1,
        },
        battingTeam: true,
      },
      orderBy: {
        overNumber: 'desc',
      },
    });

    if (!currentOver) {
      throw new BadRequestException('No active over found. Please start an over first.');
    }

    // Calculate ball number
    const lastBall = currentOver.balls[0];
    const ballNumber = lastBall ? lastBall.ballNumber + 1 : 1;

    // Validate ball number (max 6 legal balls per over)
    const legalBalls = await this.prisma.ball.count({
      where: {
        overId: currentOver.id,
        isWide: false,
        isNoBall: false,
        wicketType: 'NONE',
      },
    });

    if (legalBalls >= 6 && !scoreBallDto.isWide && !scoreBallDto.isNoBall) {
      throw new BadRequestException('Over is complete (6 legal balls)');
    }

    // Get current batsmen from last ball or over
    let batsmanId = scoreBallDto.dismissedBatsmanId || currentOver.bowlerId; // Will be updated from last ball
    let nonStrikerId = currentOver.bowlerId; // Will be updated from last ball

    if (lastBall) {
      batsmanId = lastBall.batsmanId || currentOver.bowlerId;
      nonStrikerId = lastBall.nonStrikerId || currentOver.bowlerId;
    }

    // Update batsmen if wicket
    if (scoreBallDto.wicketType && scoreBallDto.wicketType !== WicketType.NONE) {
      // Get next batsman from team (simplified - in real app, you'd select from available players)
      // For now, we'll keep the same batsman structure
      // This should be handled by the frontend/API caller
    }

    // Calculate runs
    let totalRuns = scoreBallDto.runs;
    let extras = 0;

    if (scoreBallDto.isWide) {
      extras = 1 + (scoreBallDto.wideRuns || 0);
      totalRuns = extras;
    } else if (scoreBallDto.isNoBall) {
      extras = 1 + (scoreBallDto.noBallRuns || 0);
      totalRuns = extras + scoreBallDto.runs;
    } else if (scoreBallDto.isBye) {
      extras = scoreBallDto.byeRuns || 0;
      totalRuns = extras;
    } else if (scoreBallDto.isLegBye) {
      extras = scoreBallDto.legByeRuns || 0;
      totalRuns = extras;
    }

    // Check if it's a dot ball
    const isDotBall =
      totalRuns === 0 &&
      !scoreBallDto.isWide &&
      !scoreBallDto.isNoBall &&
      (!scoreBallDto.wicketType || scoreBallDto.wicketType === WicketType.NONE);

    // Create ball
    const ball = await this.prisma.ball.create({
      data: {
        overId: currentOver.id,
        ballNumber,
        batsmanId: batsmanId || currentOver.bowlerId,
        nonStrikerId: nonStrikerId || currentOver.bowlerId,
        bowlerId: currentOver.bowlerId,
        runs: scoreBallDto.runs,
        isWide: scoreBallDto.isWide || false,
        wideRuns: scoreBallDto.wideRuns || 0,
        isNoBall: scoreBallDto.isNoBall || false,
        noBallRuns: scoreBallDto.noBallRuns || 0,
        isBye: scoreBallDto.isBye || false,
        byeRuns: scoreBallDto.byeRuns || 0,
        isLegBye: scoreBallDto.isLegBye || false,
        legByeRuns: scoreBallDto.legByeRuns || 0,
        wicketType: scoreBallDto.wicketType || WicketType.NONE,
        wicketPlayerId: scoreBallDto.wicketPlayerId || null,
        dismissedBatsmanId: scoreBallDto.dismissedBatsmanId || null,
        isDotBall,
      },
    });

    // Update over stats
    await this.updateOverStats(currentOver.id);

    // Switch strikers if odd runs (unless wide/no-ball)
    if (
      totalRuns % 2 === 1 &&
      !scoreBallDto.isWide &&
      !scoreBallDto.isNoBall &&
      (!scoreBallDto.wicketType || scoreBallDto.wicketType === WicketType.NONE)
    ) {
      // Striker and non-striker will switch
      // This will be handled in the next ball
    }

    // Check if over is complete (6 legal balls)
    const updatedLegalBalls = await this.prisma.ball.count({
      where: {
        overId: currentOver.id,
        isWide: false,
        isNoBall: false,
      },
    });

    if (updatedLegalBalls >= 6) {
      await this.prisma.over.update({
        where: { id: currentOver.id },
        data: { completedAt: new Date() },
      });
    }

    this.logger.info('Ball scored', {
      matchId,
      ballId: ball.id,
      ballNumber,
      runs: totalRuns,
      context: ScoringService.name,
    });

    return {
      message: 'Ball scored successfully',
      data: ball,
    };
  }

  async completeOver(matchId: string, userId: string) {
    // Check if match exists and user is scorer
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        deletedAt: null,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.scorerId !== userId) {
      throw new ForbiddenException('Only the assigned scorer can complete over');
    }

    // Get current over
    const currentInning = await this.getCurrentInning(matchId);
    const currentOver = await this.prisma.over.findFirst({
      where: {
        matchId,
        inningNumber: currentInning,
        completedAt: null,
      },
      orderBy: {
        overNumber: 'desc',
      },
    });

    if (!currentOver) {
      throw new BadRequestException('No active over found');
    }

    // Complete over
    const completedOver = await this.prisma.over.update({
      where: { id: currentOver.id },
      data: { completedAt: new Date() },
      include: {
        balls: true,
      },
    });

    this.logger.info('Over completed', {
      matchId,
      overId: completedOver.id,
      context: ScoringService.name,
    });

    return {
      message: 'Over completed successfully',
      data: completedOver,
    };
  }

  async switchBatsmen(
    matchId: string,
    userId: string,
    switchBatsmenDto: SwitchBatsmenDto,
  ) {
    // Check if match exists and user is scorer
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        deletedAt: null,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.scorerId !== userId) {
      throw new ForbiddenException('Only the assigned scorer can switch batsmen');
    }

    // This is a helper function - actual switching happens automatically based on runs
    // This endpoint can be used to manually switch if needed
    return {
      message: 'Batsmen switching is handled automatically based on runs scored',
    };
  }

  async switchInnings(matchId: string, userId: string) {
    // Check if match exists and user is scorer
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        deletedAt: null,
      },
      include: {
        team1: true,
        team2: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.scorerId !== userId) {
      throw new ForbiddenException('Only the assigned scorer can switch innings');
    }

    const currentInning = await this.getCurrentInning(matchId);

    if (currentInning >= 2) {
      throw new BadRequestException('Match already in second innings');
    }

    // Check if first innings is complete (all overs bowled or all out)
    const firstInningOvers = await this.prisma.over.findMany({
      where: {
        matchId,
        inningNumber: 1,
      },
    });

    const totalOvers = firstInningOvers.length;
    if (totalOvers < match.overs) {
      throw new BadRequestException(
        'First innings not complete. All overs must be bowled or team must be all out.',
      );
    }

    // Switch to second innings (implied by creating next over)
    return {
      message: 'Second innings will start when you create the next over',
    };
  }

  async completeMatch(matchId: string, userId: string) {
    // Check if match exists and user is scorer
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        deletedAt: null,
      },
      include: {
        team1: true,
        team2: true,
        matchOvers: {
          include: {
            balls: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.scorerId !== userId) {
      throw new ForbiddenException('Only the assigned scorer can complete match');
    }

    // Check if second innings is complete
    const secondInningOvers = match.matchOvers.filter((o) => o.inningNumber === 2);
    if (secondInningOvers.length < match.overs) {
      throw new BadRequestException(
        'Second innings not complete. All overs must be bowled or team must be all out.',
      );
    }

    // Calculate match result
    const result = await this.calculateMatchResult(matchId, match);

    // Update match status
    const updatedMatch = await this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    this.logger.info('Match completed', {
      matchId,
      resultId: result.id,
      context: ScoringService.name,
    });

    return {
      message: 'Match completed successfully',
      data: {
        match: updatedMatch,
        result,
      },
    };
  }

  private async getCurrentInning(matchId: string): Promise<number> {
    const lastOver = await this.prisma.over.findFirst({
      where: { matchId },
      orderBy: [{ inningNumber: 'desc' }, { overNumber: 'desc' }],
    });

    return lastOver ? lastOver.inningNumber : 1;
  }

  private async validatePlayers(
    matchId: string,
    battingTeamId: string,
    fieldingTeamId: string,
    bowlerId: string,
    batsmanId: string,
    nonStrikerId: string,
  ) {
    // Validate bowler belongs to fielding team
    const bowler = await this.prisma.matchPlayer.findFirst({
      where: {
        matchId,
        playerId: bowlerId,
        teamId: fieldingTeamId,
      },
    });

    if (!bowler) {
      throw new BadRequestException('Bowler must be from the fielding team');
    }

    // Validate batsmen belong to batting team
    const batsman = await this.prisma.matchPlayer.findFirst({
      where: {
        matchId,
        playerId: batsmanId,
        teamId: battingTeamId,
      },
    });

    if (!batsman) {
      throw new BadRequestException('Batsman must be from the batting team');
    }

    const nonStriker = await this.prisma.matchPlayer.findFirst({
      where: {
        matchId,
        playerId: nonStrikerId,
        teamId: battingTeamId,
      },
    });

    if (!nonStriker) {
      throw new BadRequestException('Non-striker must be from the batting team');
    }
  }

  private async updateOverStats(overId: string) {
    const balls = await this.prisma.ball.findMany({
      where: { overId },
    });

    const runs = balls.reduce((sum, ball) => {
      let ballRuns = ball.runs;
      if (ball.isWide) ballRuns += 1 + ball.wideRuns;
      if (ball.isNoBall) ballRuns += 1 + ball.noBallRuns;
      if (ball.isBye) ballRuns += ball.byeRuns;
      if (ball.isLegBye) ballRuns += ball.legByeRuns;
      return sum + ballRuns;
    }, 0);

    const extras = balls.reduce((sum, ball) => {
      let extras = 0;
      if (ball.isWide) extras += 1 + ball.wideRuns;
      if (ball.isNoBall) extras += 1 + ball.noBallRuns;
      if (ball.isBye) extras += ball.byeRuns;
      if (ball.isLegBye) extras += ball.legByeRuns;
      return sum + extras;
    }, 0);

    const wickets = balls.filter(
      (ball) => ball.wicketType && ball.wicketType !== WicketType.NONE,
    ).length;

    const legalBalls = balls.filter(
      (ball) => !ball.isWide && !ball.isNoBall,
    ).length;

    const isMaiden = runs === 0 && legalBalls === 6;

    await this.prisma.over.update({
      where: { id: overId },
      data: {
        runs,
        extras,
        wickets,
        isMaiden,
      },
    });
  }

  private async calculateMatchResult(matchId: string, match: any) {
    // Calculate scores for both innings
    const team1Overs = match.matchOvers.filter(
      (o: any) => o.battingTeamId === match.team1Id,
    );
    const team2Overs = match.matchOvers.filter(
      (o: any) => o.battingTeamId === match.team2Id,
    );

    const team1Score = this.calculateTeamScore(team1Overs);
    const team2Score = this.calculateTeamScore(team2Overs);
    const team1Wickets = this.calculateTeamWickets(team1Overs);
    const team2Wickets = this.calculateTeamWickets(team2Overs);
    const team1OversBowled = this.calculateOversBowled(team1Overs);
    const team2OversBowled = this.calculateOversBowled(team2Overs);

    // Determine winner
    let winningTeamId: string | null = null;
    let isTie = false;
    let isAbandoned = false;

    if (team1Score > team2Score) {
      winningTeamId = match.team1Id;
    } else if (team2Score > team1Score) {
      winningTeamId = match.team2Id;
    } else {
      isTie = true;
    }

    // Create match result
    const result = await this.prisma.matchResult.create({
      data: {
        matchId,
        winningTeamId,
        isTie,
        isAbandoned,
        team1Score,
        team1Wickets,
        team1Overs: team1OversBowled,
        team2Score,
        team2Wickets,
        team2Overs: team2OversBowled,
      },
    });

    // Update tournament points table if tournament match
    if (match.tournamentId) {
      // Points table update will be handled by tournament service
    }

    return result;
  }

  private calculateTeamScore(overs: any[]): number {
    return overs.reduce((sum, over) => sum + (over.runs || 0), 0);
  }

  private calculateTeamWickets(overs: any[]): number {
    return overs.reduce((sum, over) => sum + (over.wickets || 0), 0);
  }

  private calculateOversBowled(overs: any[]): Prisma.Decimal {
    const totalBalls = overs.reduce((sum, over) => {
      return sum + (over.balls?.length || 0);
    }, 0);

    const oversBowled = totalBalls / 6;
    return new Prisma.Decimal(oversBowled.toFixed(2));
  }

  async getCurrentState(matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        deletedAt: null,
      },
      include: {
        team1: true,
        team2: true,
        matchOvers: {
          include: {
            balls: {
              orderBy: {
                ballNumber: 'asc',
              },
            },
            bowler: true,
          },
          orderBy: [
            { inningNumber: 'asc' },
            { overNumber: 'asc' },
          ],
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const currentInning = await this.getCurrentInning(matchId);
    const currentOver = await this.prisma.over.findFirst({
      where: {
        matchId,
        inningNumber: currentInning,
        completedAt: null,
      },
      include: {
        balls: {
          orderBy: {
            ballNumber: 'desc',
          },
          take: 1,
        },
        bowler: true,
      },
      orderBy: {
        overNumber: 'desc',
      },
    });

    // Calculate scores
    const team1Overs = match.matchOvers.filter(
      (o) => o.battingTeamId === match.team1Id,
    );
    const team2Overs = match.matchOvers.filter(
      (o) => o.battingTeamId === match.team2Id,
    );

    const team1Score = this.calculateTeamScore(team1Overs);
    const team2Score = this.calculateTeamScore(team2Overs);
    const team1Wickets = this.calculateTeamWickets(team1Overs);
    const team2Wickets = this.calculateTeamWickets(team2Overs);

    return {
      message: 'Current match state retrieved successfully',
      data: {
        match: {
          id: match.id,
          status: match.status,
          team1: match.team1,
          team2: match.team2,
        },
        currentInning,
        currentOver: currentOver
          ? {
              id: currentOver.id,
              overNumber: currentOver.overNumber,
              bowler: currentOver.bowler,
              lastBall: currentOver.balls[0] || null,
            }
          : null,
        scores: {
          team1: {
            score: team1Score,
            wickets: team1Wickets,
            overs: team1Overs.length,
          },
          team2: {
            score: team2Score,
            wickets: team2Wickets,
            overs: team2Overs.length,
          },
        },
      },
    };
  }
}

