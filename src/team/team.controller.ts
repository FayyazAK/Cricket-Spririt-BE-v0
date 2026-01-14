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
import { TeamService } from './team.service';
import { CreateTeamDto } from './dtos/create-team.dto';
import { UpdateTeamDto } from './dtos/update-team.dto';
import { AddPlayerToTeamDto } from './dtos/add-player-to-team.dto';
import { TeamResponseDto } from './dtos/team-response.dto';
import { Serialize } from '../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadService } from '../common/upload/upload.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/database/database.service';

@Controller('teams')
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Serialize(TeamResponseDto)
  async create(@CurrentUser() user: any, @Body() createTeamDto: CreateTeamDto) {
    return this.teamService.create(user.id, createTeamDto);
  }

  @Get()
  @Serialize(TeamResponseDto)
  async findAll() {
    return this.teamService.findAll();
  }

  @Get(':id')
  @Serialize(TeamResponseDto)
  async findOne(@Param('id') id: string) {
    return this.teamService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Serialize(TeamResponseDto)
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamService.update(id, user.id, updateTeamDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.teamService.remove(id, user.id);
  }

  @Post(':id/players')
  @UseGuards(JwtAuthGuard)
  async addPlayer(
    @Param('id') teamId: string,
    @CurrentUser() user: any,
    @Body() addPlayerDto: AddPlayerToTeamDto,
  ) {
    return this.teamService.addPlayer(teamId, user.id, addPlayerDto);
  }

  @Get(':id/players')
  async getPlayers(@Param('id') teamId: string) {
    return this.teamService.getPlayers(teamId);
  }

  @Delete(':id/players/:playerId')
  @UseGuards(JwtAuthGuard)
  async removePlayer(
    @Param('id') teamId: string,
    @Param('playerId') playerId: string,
    @CurrentUser() user: any,
  ) {
    return this.teamService.removePlayer(teamId, playerId, user.id);
  }

  @Get('invitations')
  @UseGuards(JwtAuthGuard)
  async getInvitations(@CurrentUser() user: any) {
    // First get player profile for user
    const player = await this.prisma.player.findUnique({
      where: { userId: user.id },
    });

    if (!player) {
      return {
        message: 'No invitations found',
        data: [],
      };
    }

    return this.teamService.getInvitations(player.id);
  }

  @Post('invitations/:invitationId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.teamService.acceptInvitation(invitationId, user.id);
  }

  @Post('invitations/:invitationId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: any,
  ) {
    return this.teamService.rejectInvitation(invitationId, user.id);
  }

  @Post('upload-logo')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
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

    const filePath = await this.uploadService.saveFile(file, 'logos');
    const fileUrl = this.uploadService.getFileUrl(filePath);

    return {
      message: 'Logo uploaded successfully',
      data: {
        filePath,
        fileUrl,
      },
    };
  }
}

