import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TournamentService } from './tournament.service';
import { CreateTournamentDto } from './dtos/create-tournament.dto';
import { UpdateTournamentDto } from './dtos/update-tournament.dto';
import { AddTeamToTournamentDto } from './dtos/add-team-to-tournament.dto';
import { TournamentResponseDto } from './dtos/tournament-response.dto';
import { Serialize } from '../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadService } from '../common/upload/upload.service';
import { ConfigService } from '@nestjs/config';
import { PointsTableService } from './points-table.service';
import { PrismaService } from '../common/database/database.service';
import { NotFoundException } from '@nestjs/common';

@Controller('tournaments')
export class TournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly pointsTableService: PointsTableService,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Serialize(TournamentResponseDto)
  async create(
    @CurrentUser() user: any,
    @Body() createTournamentDto: CreateTournamentDto,
  ) {
    return this.tournamentService.create(user.id, createTournamentDto);
  }

  @Get()
  @Serialize(TournamentResponseDto)
  async findAll() {
    return this.tournamentService.findAll();
  }

  @Get(':id')
  @Serialize(TournamentResponseDto)
  async findOne(@Param('id') id: string) {
    return this.tournamentService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Serialize(TournamentResponseDto)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    return this.tournamentService.update(id, user.id, updateTournamentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tournamentService.remove(id, user.id);
  }

  @Post(':id/teams')
  @UseGuards(JwtAuthGuard)
  async addTeam(
    @Param('id') tournamentId: string,
    @CurrentUser() user: any,
    @Body() addTeamDto: AddTeamToTournamentDto,
  ) {
    return this.tournamentService.addTeam(
      tournamentId,
      user.id,
      addTeamDto,
    );
  }

  @Get(':id/teams')
  async getTeams(@Param('id') tournamentId: string) {
    return this.tournamentService.getTeams(tournamentId);
  }

  @Delete(':id/teams/:teamId')
  @UseGuards(JwtAuthGuard)
  async removeTeam(
    @Param('id') tournamentId: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: any,
  ) {
    return this.tournamentService.removeTeam(tournamentId, teamId, user.id);
  }

  @Post(':id/teams/:teamId/withdraw')
  @UseGuards(JwtAuthGuard)
  async withdrawTeam(
    @Param('id') tournamentId: string,
    @Param('teamId') teamId: string,
    @CurrentUser() user: any,
  ) {
    return this.tournamentService.withdrawTeam(
      tournamentId,
      teamId,
      user.id,
    );
  }

  @Get(':id/invitations')
  @UseGuards(JwtAuthGuard)
  async getInvitations(
    @Param('id') tournamentId: string,
    @CurrentUser() user: any,
  ) {
    return this.tournamentService.getInvitations(tournamentId, user.id);
  }

  @Post('invitations/:invitationId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.tournamentService.acceptInvitation(invitationId, user.id);
  }

  @Post('invitations/:invitationId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.tournamentService.rejectInvitation(invitationId, user.id);
  }

  @Get(':id/points-table')
  async getPointsTable(@Param('id') tournamentId: string) {
    return this.pointsTableService.getPointsTable(tournamentId);
  }

  @Post(':id/points-table/calculate')
  @UseGuards(JwtAuthGuard)
  async calculatePointsTable(
    @Param('id') tournamentId: string,
    @CurrentUser() user: any,
  ) {
    // Check if user is tournament creator
    const tournament = await this.prisma.tournament.findFirst({
      where: {
        id: tournamentId,
        creatorId: user.id,
        deletedAt: null,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        'Tournament not found or you do not have permission',
      );
    }

    return this.pointsTableService.calculatePointsTable(tournamentId);
  }

  @Post('upload-cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 1048576, // 1MB
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Validate MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed.',
      );
    }

    const filePath = await this.uploadService.saveFile(
      file,
      'tournament-covers',
    );
    const fileUrl = this.uploadService.getFileUrl(filePath);

    return {
      message: 'Cover picture uploaded successfully',
      data: {
        filePath,
        fileUrl,
      },
    };
  }

  @Post('upload-profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 1048576, // 1MB
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    // Validate MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed.',
      );
    }

    const filePath = await this.uploadService.saveFile(
      file,
      'tournament-profiles',
    );
    const fileUrl = this.uploadService.getFileUrl(filePath);

    return {
      message: 'Profile picture uploaded successfully',
      data: {
        filePath,
        fileUrl,
      },
    };
  }
}

