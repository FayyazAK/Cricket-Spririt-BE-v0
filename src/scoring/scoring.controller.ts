import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { StartOverDto } from './dtos/start-over.dto';
import { ScoreBallDto } from './dtos/score-ball.dto';
import { SwitchBatsmenDto } from './dtos/switch-batsmen.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('matches/:matchId/scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post('start-over')
  @UseGuards(JwtAuthGuard)
  async startOver(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
    @Body() startOverDto: StartOverDto,
  ) {
    return this.scoringService.startOver(matchId, user.id, startOverDto);
  }

  @Post('score-ball')
  @UseGuards(JwtAuthGuard)
  async scoreBall(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
    @Body() scoreBallDto: ScoreBallDto,
  ) {
    return this.scoringService.scoreBall(matchId, user.id, scoreBallDto);
  }

  @Post('complete-over')
  @UseGuards(JwtAuthGuard)
  async completeOver(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
  ) {
    return this.scoringService.completeOver(matchId, user.id);
  }

  @Post('switch-batsmen')
  @UseGuards(JwtAuthGuard)
  async switchBatsmen(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
    @Body() switchBatsmenDto: SwitchBatsmenDto,
  ) {
    return this.scoringService.switchBatsmen(
      matchId,
      user.id,
      switchBatsmenDto,
    );
  }

  @Post('switch-innings')
  @UseGuards(JwtAuthGuard)
  async switchInnings(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
  ) {
    return this.scoringService.switchInnings(matchId, user.id);
  }

  @Post('complete-match')
  @UseGuards(JwtAuthGuard)
  async completeMatch(
    @Param('matchId') matchId: string,
    @CurrentUser() user: any,
  ) {
    return this.scoringService.completeMatch(matchId, user.id);
  }

  @Get('current-state')
  @UseGuards(JwtAuthGuard)
  async getCurrentState(@Param('matchId') matchId: string) {
    return this.scoringService.getCurrentState(matchId);
  }
}

