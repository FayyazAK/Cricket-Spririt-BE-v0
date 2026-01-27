import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MatchService } from './match.service';
import { CreateMatchDto } from './dtos/create-match.dto';
import { UpdateMatchDto } from './dtos/update-match.dto';
import { TossDto } from './dtos/toss.dto';
import { AssignScorerDto } from './dtos/assign-scorer.dto';
import { MatchResponseDto } from './dtos/match-response.dto';
import { Serialize } from '../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('matches')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Serialize(MatchResponseDto)
  async create(
    @CurrentUser() user: any,
    @Body() createMatchDto: CreateMatchDto,
  ) {
    return this.matchService.create(user.id, createMatchDto);
  }

  @Get('scorer-invitations')
  @UseGuards(JwtAuthGuard)
  async getScorerInvitations(@CurrentUser() user: any) {
    return this.matchService.getScorerInvitations(user.id);
  }

  @Get('team-invitations')
  @UseGuards(JwtAuthGuard)
  async getTeamInvitations(@CurrentUser() user: any) {
    return this.matchService.getTeamInvitations(user.id);
  }

  @Get('my-matches')
  @UseGuards(JwtAuthGuard)
  async getMyMatches(@CurrentUser() user: any) {
    return this.matchService.getMyMatches(user.id);
  }

  @Post('scorer-invitations/:invitationId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptScorerInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.matchService.acceptScorerInvitation(invitationId, user.id);
  }

  @Post('scorer-invitations/:invitationId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectScorerInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.matchService.rejectScorerInvitation(invitationId, user.id);
  }

  @Get()
  @Serialize(MatchResponseDto)
  @UseGuards(JwtAuthGuard)
  async findAll(
    @CurrentUser() user: any,
    @Query('tournamentId') tournamentId?: string,
  ) {
    return this.matchService.findAll(user.id, tournamentId);
  }

  @Get(':id')
  @Serialize(MatchResponseDto)
  async findOne(@Param('id') id: string) {
    return this.matchService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Serialize(MatchResponseDto)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateMatchDto: UpdateMatchDto,
  ) {
    return this.matchService.update(id, user.id, updateMatchDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.matchService.remove(id, user.id);
  }

  @Post(':id/scorer')
  @UseGuards(JwtAuthGuard)
  async assignScorer(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() assignScorerDto: AssignScorerDto,
  ) {
    return this.matchService.assignScorer(id, user.id, assignScorerDto);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  async startMatch(@Param('id') id: string, @CurrentUser() user: any) {
    return this.matchService.startMatch(id, user.id);
  }

  @Post(':id/toss')
  @UseGuards(JwtAuthGuard)
  async recordToss(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() tossDto: TossDto,
  ) {
    return this.matchService.recordToss(id, user.id, tossDto);
  }

  @Get(':id/invitations')
  @UseGuards(JwtAuthGuard)
  async getInvitations(@Param('id') matchId: string) {
    return this.matchService.getInvitations(matchId);
  }

  @Post('invitations/:invitationId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.matchService.acceptInvitation(invitationId, user.id);
  }

  @Post('invitations/:invitationId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.matchService.rejectInvitation(invitationId, user.id);
  }

  @Get(':id/result')
  async getResult(@Param('id') matchId: string) {
    return this.matchService.getResult(matchId);
  }
}

