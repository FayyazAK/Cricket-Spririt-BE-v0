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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClubService } from './club.service';
import { CreateClubDto } from './dtos/create-club.dto';
import { UpdateClubDto } from './dtos/update-club.dto';
import { AddPlayerToClubDto } from './dtos/add-player-to-club.dto';
import { ClubResponseDto } from './dtos/club-response.dto';
import {
  ClubInvitationResponseDto,
  ClubPlayersListResponseDto,
} from './dtos/club-player-response.dto';
import { Serialize } from '../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtAuthOptionalGuard } from '../auth/guards/jwt-auth-optional.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadService } from '../common/upload/upload.service';
import { ConfigService } from '@nestjs/config';
import { InvitationStatus } from '@prisma/client';

@Controller('clubs')
export class ClubController {
  constructor(
    private readonly clubService: ClubService,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Serialize(ClubResponseDto)
  async create(@CurrentUser() user: any, @Body() createClubDto: CreateClubDto) {
    return this.clubService.create(user.id, createClubDto);
  }

  @Get()
  @Serialize(ClubResponseDto)
  async findAll() {
    return this.clubService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthOptionalGuard)
  @Serialize(ClubResponseDto)
  async findOne(@Param('id') id: string, @CurrentUser() user?: any) {
    return this.clubService.findOne(id, user?.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Serialize(ClubResponseDto)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateClubDto: UpdateClubDto,
  ) {
    return this.clubService.update(id, user.id, updateClubDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.clubService.remove(id, user.id);
  }

  @Get(':id/teams')
  async getTeams(@Param('id') id: string) {
    return this.clubService.getTeams(id);
  }

  @Post('upload-profile-picture')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
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
      'profile-pictures',
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

  // ============================================
  // CLUB PLAYER MANAGEMENT
  // ============================================

  @Post(':id/players')
  @UseGuards(JwtAuthGuard)
  @Serialize(ClubInvitationResponseDto)
  async addPlayer(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() addPlayerDto: AddPlayerToClubDto,
  ) {
    return this.clubService.addPlayer(id, user.id, addPlayerDto);
  }

  @Get(':id/players')
  @Serialize(ClubPlayersListResponseDto)
  async getPlayers(
    @Param('id') id: string,
    @Query('status') status?: InvitationStatus,
  ) {
    return this.clubService.getPlayers(id, status);
  }

  @Get(':id/invitations')
  @UseGuards(JwtAuthGuard)
  @Serialize(ClubInvitationResponseDto)
  async getInvitations(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.clubService.getInvitations(id, user.id, status);
  }

  @Delete(':id/players/:playerId')
  @UseGuards(JwtAuthGuard)
  async removePlayer(
    @Param('id') id: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: any,
  ) {
    return this.clubService.removePlayer(id, playerId, user.id);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  async leaveClub(@Param('id') id: string, @CurrentUser() user: any) {
    return this.clubService.leaveClub(id, user.id);
  }

  @Delete(':id/invitations/:invitationId')
  @UseGuards(JwtAuthGuard)
  @Serialize(ClubInvitationResponseDto)
  async withdrawInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.clubService.withdrawInvitation(id, invitationId, user.id);
  }

  @Post(':id/invitations/:invitationId/resend')
  @UseGuards(JwtAuthGuard)
  @Serialize(ClubInvitationResponseDto)
  async resendInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.clubService.resendInvitation(id, invitationId, user.id);
  }

  // ============================================
  // CLUB INVITATION RESPONSES (For Players)
  // ============================================

  @Post('invitations/:invitationId/accept')
  @UseGuards(JwtAuthGuard)
  @Serialize(ClubInvitationResponseDto)
  async acceptInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.clubService.acceptInvitation(invitationId, user.id);
  }

  @Post('invitations/:invitationId/reject')
  @UseGuards(JwtAuthGuard)
  @Serialize(ClubInvitationResponseDto)
  async rejectInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.clubService.rejectInvitation(invitationId, user.id);
  }
}

